"""
Insights Orchestrator — Unified Conversational ERP Pipeline for AcadMix.

Coordinates:
1. Intent Router: Classifies intent (KNOWN_MV, GENERATE_SQL, VAGUE).
2. Data Resolver: Maps KNOWN_MV to optimized paths, or generates custom SQL.
3. Safety Validator: Enforces SELECT-only, department scoping, and timeouts.
4. Viz Binder: Deterministic chart selection overruling LLM on bad cardinality/row counts.
5. Response Formatter: Compiles standardized response envelope with AI summary.
"""
import json
import logging
import hashlib
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.core.config import settings
from app.schemas.insights import InsightsQueryRequest, InsightsQueryResponse, ChatMessage
from app.services.llm_gateway import gateway
from app.services.ai_service import generate_insights_sql, validate_insights_semantics, format_insights_summary
from app.services.insights_executor import execute_insights_query, validate_sql_safety

logger = logging.getLogger("acadmix.insights_orchestrator")

MV_REGISTRY = {
    "fee_collection_dept": {"view": "mv_fee_collection_by_dept", "description": "Fee collection by department", "columns": "department,total_invoiced,total_collected,collection_rate"},
    "fee_collection_type": {"view": "mv_fee_collection_by_type", "description": "Fee collection by fee type", "columns": "fee_type,total_invoiced,total_collected,collection_rate"},
    "unpaid_invoices": {"view": "mv_unpaid_invoice_summary", "description": "Unpaid fee invoices", "columns": "department,unpaid_count,unpaid_amount"},
    "scholarship": {"view": "mv_scholarship_summary", "description": "Scholarship applications by dept", "columns": "department,total_applications,approved,rejected,pending,total_amount"},
    "attendance_dept": {"view": "mv_attendance_by_dept", "description": "Attendance % by department", "columns": "department,batch,total_records,present_count,attendance_pct"},
    "attendance_student": {"view": "mv_student_attendance", "description": "Per-student attendance with percentage. Supports filtering by attendance_pct threshold and department", "columns": "student_name,department,roll_number,batch,enrollment_status,total_classes,attended,absent_count,attendance_pct"},
    "gpa_dept": {"view": "mv_gpa_by_dept", "description": "Average CGPA by department", "columns": "department,student_count,avg_cgpa,min_cgpa,max_cgpa"},
    "top_students": {"view": "mv_top_students_cgpa", "description": "Top students by CGPA", "columns": "student_name,department,roll_number,cgpa"},
    "pass_fail": {"view": "mv_pass_fail_rates", "description": "Pass/fail rates by department", "columns": "department,total_grades,pass_count,fail_count,pass_rate"},
    "marks": {"view": "mv_marks_summary", "description": "Marks/exam summary", "columns": "department,exam_type,subject_code,avg_marks,max_marks,min_marks,submission_count"},
    "enrollment": {"view": "mv_enrollment_by_dept", "description": "Student enrollment by dept/batch/gender", "columns": "department,batch,gender,student_count"},
    "hostel": {"view": "mv_hostel_occupancy", "description": "Hostel occupancy rates", "columns": "hostel_name,gender_type,total_capacity,occupied,occupancy_pct"},
    "courses": {"view": "mv_course_distribution", "description": "Course distribution", "columns": "department,semester,course_count,total_credits"},
    "faculty_workload": {"view": "mv_faculty_workload", "description": "Faculty teaching workload", "columns": "department,faculty_name,subjects_assigned,sections_assigned,total_hours_per_week,total_credits"},
    "accreditation": {"view": "mv_accreditation_kpis", "description": "CO-PO mapping KPIs", "columns": "department,total_cos,total_pos,total_mappings,avg_strength"},
}
MV_LIST = "\n".join([f"- {k} [cols: {v['columns']}]: {v['description']}" for k, v in MV_REGISTRY.items()])

CLASSIFIER_PROMPT = f"""You are the Intent Router for AcadMix Conversational ERP.
Your task is to classify the user's natural language database query into exactly one category:

KNOWN_MV:<key> — matches a pre-computed materialized view (use filter if needed)
GENERATE_SQL — requires custom SQL generation or does not cleanly fit a view.
VAGUE — query is not a data query, is small talk, or is too vague to answer.

Views:
{MV_LIST}

Examples:
- "attendance by department" => KNOWN_MV:attendance_dept
- "students below 50% attendance" => KNOWN_MV:attendance_student|filter:attendance_pct < 50
- "faculty load in ECE" => KNOWN_MV:faculty_workload|filter:department = 'ECE'
- "how many students?" => GENERATE_SQL
- "students who got F grade" => GENERATE_SQL
- "what is wrong with the college?" => VAGUE

Respond ONLY with: KNOWN_MV:<key>, KNOWN_MV:<key>|filter:<condition>, GENERATE_SQL, or VAGUE. Do not include any other text."""

async def _get_redis():
    """Lazy-import the shared Redis pool."""
    try:
        from app.services.wa_state_machine import get_redis
        return await get_redis()
    except Exception:
        return None

def _insights_cache_key(sql: str, role: str) -> str:
    """SHA-256 hash of (generated SQL + role) for semantic cache deduplication."""
    digest = hashlib.sha256(f"{role}:{sql.strip()}".encode()).hexdigest()
    return f"insights_cache:v3:{digest}"

async def route_intent(query: str) -> str:
    """Classifies the query intent using Vertex Flash Lite."""
    messages = [
        {"role": "system", "content": CLASSIFIER_PROMPT},
        {"role": "user", "content": query}
    ]
    try:
        response = await gateway.complete("erp_summary", messages=messages, temperature=0.0)
        category = response.strip().upper()
        if category.startswith("KNOWN_MV") or category in ["GENERATE_SQL", "VAGUE"]:
            return category
        return "GENERATE_SQL"  # Fallback
    except Exception as e:
        logger.warning(f"Intent routing failed, defaulting to GENERATE_SQL: {e}")
        return "GENERATE_SQL"

def auto_select_visualization(data: List[Dict[str, Any]], columns: List[str], llm_suggestion: Optional[str], x_col: Optional[str], y_col: Optional[str], group_col: Optional[str]) -> Dict[str, Any]:
    """
    Enforces deterministic visual auto-selection (rules engine).
    Overrules LLM suggestions if the raw data cardinality makes specific charts unreadable.
    """
    row_count = len(data)
    if row_count == 0:
        return {"chart_suggestion": None, "x_column": None, "y_column": None, "group_column": None}
    
    # Check for numeric columns
    first_row = data[0]
    numeric_cols = [col for col in columns if isinstance(first_row.get(col), (int, float))]
    string_cols = [col for col in columns if isinstance(first_row.get(col), str)]

    # Rule 1: High row count fallback
    # If data exceeds 50 rows, FORCE a tabular layout (bar or pie charts look terrible with 50+ items)
    if row_count > 50:
        logger.info(f"Visual selector: Capping at {row_count} rows. Enforcing 'table' view.")
        return {
            "chart_suggestion": None,
            "x_column": x_col,
            "y_column": y_col,
            "group_column": group_col
        }
    
    # Rule 2: KPI Card for single metric/value
    # If there is 1 row and 1-3 numeric columns, use kpi_card
    if row_count <= 2 and len(numeric_cols) >= 1 and len(columns) - len(numeric_cols) <= 1:
        logger.info("Visual selector: Enforcing 'kpi_card' view for single-metric summary.")
        return {
            "chart_suggestion": "kpi_card",
            "x_column": None,
            "y_column": numeric_cols[0],
            "group_column": None
        }

    # Rule 3: Pie Chart validation
    # A pie chart is only readable with 2-6 categories. If category count is outside this range, overrule to bar_chart.
    suggestion = llm_suggestion
    if suggestion == "pie_chart":
        if x_col and x_col in first_row:
            unique_categories = len(set(str(row.get(x_col, '')) for row in data if row.get(x_col) is not None))
            if unique_categories < 2 or unique_categories > 6:
                logger.info(f"Visual selector: Overruling pie_chart with {unique_categories} categories to bar_chart.")
                suggestion = "bar_chart"
        else:
            suggestion = "bar_chart"
    
    # Tier 1 Shape Rule: Enforce Pie Chart if categories are small and column implies ratios
    if x_col and suggestion != "pie_chart":
        unique_categories = len(set(str(row.get(x_col, '')) for row in data if row.get(x_col) is not None))
        if 2 <= unique_categories <= 5:
            # Check if any column header implies a ratio or split
            if any(term in "".join(columns).lower() for term in ["share", "split", "ratio", "pct", "percentage", "rate", "gender"]):
                logger.info("Visual selector: Enforcing 'pie_chart' due to ratio terminology and low cardinality.")
                suggestion = "pie_chart"

    # Rule 4: Grouped Bar vs Standard Bar validation
    # If a group_column is specified but there is no actual variation, treat as standard bar.
    if group_col and group_col in first_row:
        unique_groups = len(set(str(row.get(group_col, '')) for row in data if row.get(group_col) is not None))
        if unique_groups <= 1:
            logger.info("Visual selector: Grouping has 1 or fewer classes. Removing group column.")
            group_col = None
            if suggestion == "grouped_bar":
                suggestion = "bar_chart"
                
    # Tier 1 Shape Rule: Enforce Grouped Bar if 2 strings + 1 numeric
    if len(string_cols) >= 2 and len(numeric_cols) >= 1 and not group_col and suggestion != "grouped_bar":
        logger.info("Visual selector: Enforcing 'grouped_bar' due to 2 string columns and 1 numeric metric.")
        suggestion = "grouped_bar"
        x_col = string_cols[0]
        group_col = string_cols[1]
        y_col = numeric_cols[0]

    # Tier 1 Shape Rule: Enforce Line Chart for time series
    time_terms = ["month", "semester", "academic_year", "date", "year"]
    if x_col and any(term in x_col.lower() for term in time_terms) and suggestion not in ["line_chart", "multi_line"]:
        logger.info("Visual selector: Enforcing 'line_chart' due to time-based X-axis.")
        suggestion = "line_chart"

    # Resolve fallback columns if not provided
    if not x_col and string_cols:
        x_col = string_cols[0]
    if not y_col and numeric_cols:
        y_col = numeric_cols[0]

    return {
        "chart_suggestion": suggestion or "bar_chart",
        "x_column": x_col,
        "y_column": y_col,
        "group_column": group_col
    }

async def orchestrate_query(request: InsightsQueryRequest, current_user: dict, db: AsyncSession) -> InsightsQueryResponse:
    """
    Main entry point for unified conversational ERP queries.
    """
    role = current_user.get("role", "").upper()
    user_id = current_user.get("id")
    target_college = request.active_college_id if request.active_college_id and role in ["DHTE_NODAL", "SUPERADMIN"] else current_user.get("college_id")

    # Fetch department for HOD/FACULTY prompt constraint
    user_department = ""
    if role in ["HOD", "FACULTY"]:
        try:
            from sqlalchemy import text
            dept_result = await db.execute(
                text("SELECT department FROM user_profiles WHERE user_id = :uid"),
                {"uid": user_id}
            )
            dept_row = dept_result.fetchone()
            if dept_row:
                user_department = dept_row[0]
        except Exception as e:
            logger.warning(f"Could not retrieve department for role {role}: {e}")

    # Phase 1: Intent Routing
    intent = "GENERATE_SQL"
    if not request.cached_sql:
        intent = await route_intent(request.message)
        logger.info(f"Intent classified for '{request.message[:40]}': {intent}")

    if intent == "VAGUE":
        return InsightsQueryResponse(
            summary="I'm here to help with database queries and analytics (e.g., student attendance, marks, fees). Please ask a specific analytics or data-related question.",
            data=[],
            columns=[],
            chart_suggestion=None,
            x_column=None,
            y_column=None,
            group_column=None,
            all_metrics=[],
            metric_chart_map={},
            exportable=False,
            generated_sql=None
        )

    # Phase 2: Data Resolving & Safety Validator
    generated_sql = request.cached_sql
    if not generated_sql:
        if intent.startswith("KNOWN_MV:"):
            # Intercept known MV and construct raw SQL query
            parts = intent.replace("KNOWN_MV:", "").split("|filter:")
            mv_key = parts[0].strip().lower()
            filter_str = parts[1].strip() if len(parts) > 1 else None
            
            if mv_key in MV_REGISTRY:
                mv = MV_REGISTRY[mv_key]
                view_name = mv["view"]
                sql = f"SELECT * FROM {view_name} WHERE 1=1"
                
                # Parse filter safely
                if filter_str:
                    # Very basic split for "col < val" etc.
                    filters = re.split(r'\s+AND\s+', filter_str, flags=re.IGNORECASE)
                    for f in filters:
                        match = re.match(r'^(\w+)\s*(=|<|>|<=|>=|!=|ILIKE)\s*(.+)$', f.strip(), flags=re.IGNORECASE)
                        if match:
                            col, op, val = match.groups()
                            # Strip quotes from val, add them back for safety in query string (or use parameter binding later)
                            val = val.strip().strip("'")
                            if op.upper() == "ILIKE":
                                sql += f" AND {col} ILIKE '%{val}%'"
                            elif op.upper() == "=":
                                sql += f" AND {col} = '{val}'"
                            else:
                                try:
                                    num_val = float(val)
                                    sql += f" AND {col} {op} {num_val}"
                                except ValueError:
                                    sql += f" AND {col} {op} '{val}'"
                
                generated_sql = sql
            else:
                intent = "GENERATE_SQL"  # Fallback if key not found
                
        if intent == "GENERATE_SQL":
            history_dicts = [{"role": msg.role, "content": msg.content} for msg in request.session_history]
            try:
                generated_sql = await generate_insights_sql(
                    request.message, history_dicts, role, db=db, department=user_department
                )
            except Exception as e:
                logger.error(f"SQL Generation failed: {e}")
                raise HTTPException(status_code=500, detail="Failed to parse analytics query. Please try a different wording.")

    # Phase 3: Safety & Self-Healing Retry
    # First semantic check (if not cached and not MV)
    if not request.cached_sql and not intent.startswith("KNOWN_MV:"):
        try:
            is_valid = await validate_insights_semantics(request.message, generated_sql)
            if not is_valid:
                logger.info("Semantic validation failed. Retrying SQL generation with corrective context...")
                history_dicts = [{"role": msg.role, "content": msg.content} for msg in request.session_history]
                history_dicts.append({"role": "assistant", "content": generated_sql})
                history_dicts.append({
                    "role": "user",
                    "content": "The generated SQL did not accurately address the query. Regenerate, ensuring correct aggregations and groupings."
                })
                generated_sql = await generate_insights_sql(
                    request.message, history_dicts, role, db=db, department=user_department
                )
        except Exception as e:
            logger.warning(f"Semantic validation step encountered non-blocking failure: {e}")

    # Semantic Cache Lookup
    redis = await _get_redis()
    cache_key = _insights_cache_key(generated_sql, role)
    if redis and not request.cached_sql:
        try:
            cached = await redis.get(cache_key)
            if cached:
                logger.info(f"Insights cache HIT: {cache_key[:30]}")
                return InsightsQueryResponse(**json.loads(cached))
        except Exception as e:
            logger.warning(f"Redis cache look up failed (non-blocking): {e}")

    # Execute SQL securely
    max_attempts = 2
    last_error = None
    query_result = None

    for attempt in range(max_attempts):
        try:
            query_result = await execute_insights_query(
                session=db,
                sql_query=generated_sql,
                college_id=target_college,
                role=role,
                user_id=user_id
            )
            break
        except ValueError as e:
            last_error = e
            err_str = str(e)
            
            # Security blocks are absolute
            if "Blocked keyword" in err_str or "department filtering" in err_str or "outside your access scope" in err_str:
                raise HTTPException(status_code=400, detail=err_str)
            
            # Self-healing SQL repair
            if attempt < max_attempts - 1 and not request.cached_sql and not intent.startswith("KNOWN_MV:"):
                logger.info(f"Self-healing SQL retry (attempt {attempt + 1}) on ValueError: {err_str[:100]}")
                try:
                    repair_history = history_dicts.copy() if not request.cached_sql else []
                    repair_history.append({"role": "assistant", "content": generated_sql})
                    repair_history.append({
                        "role": "user",
                        "content": f"The SQL query failed with this error:\n{err_str}\n\nFix the SQL and return ONLY corrected SQL."
                    })
                    generated_sql = await generate_insights_sql(
                        request.message, repair_history, role, db=db, department=user_department
                    )
                    continue
                except Exception as ex:
                    logger.warning(f"Repair attempt failed: {ex}")
            raise HTTPException(status_code=400, detail=err_str)
        except Exception as e:
            last_error = e
            if attempt < max_attempts - 1 and not request.cached_sql and not intent.startswith("KNOWN_MV:"):
                logger.info(f"Self-healing SQL retry (attempt {attempt + 1}) on Exception: {type(e).__name__}")
                try:
                    repair_history = history_dicts.copy() if not request.cached_sql else []
                    repair_history.append({"role": "assistant", "content": generated_sql})
                    repair_history.append({
                        "role": "user",
                        "content": f"The query failed with exception: {type(e).__name__}: {str(e)}\n\nFix the SQL and return ONLY corrected SQL."
                    })
                    generated_sql = await generate_insights_sql(
                        request.message, repair_history, role, db=db, department=user_department
                    )
                    continue
                except Exception:
                    pass
            raise HTTPException(status_code=500, detail=f"Database execution failed: {type(last_error).__name__}")

    # Compile result data
    data = query_result.get("data", [])
    columns = query_result.get("columns", [])

    # Phase 4: Viz Binder & Response Formatting
    try:
        summary_info = await format_insights_summary(request.message, data)
    except Exception as e:
        logger.warning(f"AI Summary generation failed: {e}")
        summary_info = {
            "summary": f"Query executed successfully, returning {len(data)} rows.",
            "chart_suggestion": None,
            "x_column": None,
            "y_column": None,
            "group_column": None,
            "all_metrics": [],
            "metric_chart_map": {}
        }

    # Apply visual auto-selection rules engine
    viz_config = auto_select_visualization(
        data=data,
        columns=columns,
        llm_suggestion=summary_info.get("chart_suggestion"),
        x_col=summary_info.get("x_column"),
        y_col=summary_info.get("y_column"),
        group_col=summary_info.get("group_column")
    )

    response_payload = {
        "summary": summary_info.get("summary") or f"Query executed successfully, returning {len(data)} records.",
        "data": data,
        "columns": columns,
        "chart_suggestion": viz_config.get("chart_suggestion"),
        "x_column": viz_config.get("x_column"),
        "y_column": viz_config.get("y_column"),
        "group_column": viz_config.get("group_column"),
        "all_metrics": summary_info.get("all_metrics", [col for col in columns if isinstance(data[0].get(col), (int, float))]) if data else [],
        "metric_chart_map": summary_info.get("metric_chart_map", {}),
        "exportable": len(data) > 0,
        "generated_sql": generated_sql
    }

    # Write back to Redis Cache
    if redis and not request.cached_sql:
        try:
            await redis.set(cache_key, json.dumps(response_payload, default=str), ex=300)
            logger.info(f"Insights cache stored: {cache_key[:30]}")
        except Exception as e:
            logger.warning(f"Failed to cache insights response: {e}")

    return InsightsQueryResponse(**response_payload)
