import re
import time
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import text
from app.models.core import UserProfile

logger = logging.getLogger("acadmix.insights_executor")

# Deny list for any DML or DDL operations
UNSAFE_PATTERNS = [
    r"\bDROP\b", r"\bDELETE\b", r"\bUPDATE\b", r"\bINSERT\b", r"\bTRUNCATE\b",
    r"\bALTER\b", r"\bGRANT\b", r"\bREVOKE\b", r"\bCOMMIT\b", r"\bROLLBACK\b",
    r"--"
]

# ═══════════════════════════════════════════════════════════════════════════════
# FULL DATABASE SCHEMA CACHE — Introspected from information_schema
# ═══════════════════════════════════════════════════════════════════════════════

_schema_cache: dict = {"schema_str": None, "fetched_at": 0}
_SCHEMA_CACHE_TTL = 3600  # Refresh every 1 hour

# Tables that are internal/system and should NOT be exposed to the LLM
_EXCLUDED_TABLES = {
    "alembic_version", "spatial_ref_sys",  # system tables
}

async def get_full_database_schema(session: AsyncSession) -> str:
    """
    Introspects the complete public schema from information_schema.
    Returns a formatted string of all tables with columns and types.
    Cached for 1 hour since DDL changes are rare.
    """
    now = time.time()
    if _schema_cache["schema_str"] and (now - _schema_cache["fetched_at"]) < _SCHEMA_CACHE_TTL:
        return _schema_cache["schema_str"]
    
    try:
        # Pull all columns from public schema
        result = await session.execute(text("""
            SELECT 
                c.table_name,
                c.column_name,
                c.data_type,
                c.is_nullable,
                CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END AS is_pk,
                CASE WHEN tc.constraint_type = 'FOREIGN KEY' THEN 
                    ccu.table_name || '(' || ccu.column_name || ')'
                    ELSE NULL 
                END AS fk_ref
            FROM information_schema.columns c
            LEFT JOIN information_schema.key_column_usage kcu 
                ON c.table_name = kcu.table_name 
                AND c.column_name = kcu.column_name
                AND c.table_schema = kcu.table_schema
            LEFT JOIN information_schema.table_constraints tc 
                ON kcu.constraint_name = tc.constraint_name
                AND kcu.table_schema = tc.table_schema
            LEFT JOIN information_schema.constraint_column_usage ccu
                ON tc.constraint_name = ccu.constraint_name
                AND tc.table_schema = ccu.table_schema
                AND tc.constraint_type = 'FOREIGN KEY'
            WHERE c.table_schema = 'public'
            ORDER BY c.table_name, c.ordinal_position
        """))
        rows = result.fetchall()
        
        if not rows:
            logger.warning("No schema rows returned from information_schema")
            return ""
        
        # Group by table
        tables: dict[str, list] = {}
        for row in rows:
            table_name = row[0]
            if table_name in _EXCLUDED_TABLES:
                continue
            if table_name not in tables:
                tables[table_name] = []
            
            col_info = row[1]  # column_name
            data_type = row[2]
            is_pk = row[4]
            fk_ref = row[5]
            
            extras = []
            if is_pk:
                extras.append("PK")
            if fk_ref:
                extras.append(f"FK→{fk_ref}")
            
            suffix = f" [{', '.join(extras)}]" if extras else ""
            tables[table_name].append(f"{col_info}:{data_type}{suffix}")
        
        # Format as compact schema string
        lines = []
        for table_name, cols in sorted(tables.items()):
            cols_str = ", ".join(cols)
            lines.append(f"  {table_name}({cols_str})")
        
        schema_str = "\n".join(lines)
        _schema_cache["schema_str"] = schema_str
        _schema_cache["fetched_at"] = now
        logger.info("Full database schema cached: %d tables, %d total columns", 
                     len(tables), sum(len(c) for c in tables.values()))
        return schema_str
        
    except Exception as e:
        logger.error("Failed to introspect database schema: %s", e)
        return ""


# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN VALUE CACHE — Auto-discovered enum/status values from actual data
# ═══════════════════════════════════════════════════════════════════════════════

_domain_cache: dict = {"domain_str": None, "fetched_at": 0}
_DOMAIN_CACHE_TTL = 3600  # Refresh every 1 hour

# Column name patterns that likely contain enum/categorical values
_ENUM_COLUMN_PATTERNS = {
    'status', 'type', 'category', 'role', 'gender', 'priority',
    'fee_type', 'leave_type', 'drive_type', 'exam_type', 'quiz_type',
    'course_category', 'scholarship_type', 'entry_status', 'submission_status',
    'enrollment_status', 'applicant_role', 'session', 'grade',
    'is_published', 'is_supplementary', 'is_lab', 'is_mooc',
    'sector', 'work_location',
}


async def get_domain_values(session: AsyncSession) -> str:
    """
    Auto-discovers distinct values for enum/status/category columns
    by querying the actual BASE TABLES (not temp views which may not exist
    in this session context).
    
    Strategy:
    1. Query information_schema for all varchar/text columns matching enum patterns
    2. For each, run SELECT DISTINCT to get actual values
    3. Cache results for 1 hour
    
    Returns a formatted string like:
      payments.status: 'success', 'pending', 'failed'
      invoices.fee_type: 'Tuition Fee', 'Exam Fee', ...
    """
    now = time.time()
    if _domain_cache["domain_str"] and (now - _domain_cache["fetched_at"]) < _DOMAIN_CACHE_TTL:
        return _domain_cache["domain_str"]
    
    try:
        # Step 1: Find all candidate enum columns from information_schema
        result = await session.execute(text("""
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND data_type IN ('character varying', 'text', 'USER-DEFINED')
              AND (
                column_name IN (
                    'status', 'type', 'category', 'role', 'gender', 'priority',
                    'fee_type', 'leave_type', 'drive_type', 'exam_type', 'quiz_type',
                    'course_category', 'scholarship_type', 'entry_status', 
                    'submission_status', 'enrollment_status', 'applicant_role',
                    'session', 'grade', 'sector', 'work_location', 'blood_group',
                    'semester', 'academic_year', 'batch'
                )
                OR column_name LIKE '%_status'
                OR column_name LIKE '%_type'
              )
            ORDER BY table_name, column_name
        """))
        candidates = result.fetchall()
        
        if not candidates:
            return ""
        
        # Step 2: Query distinct values for each candidate (with per-query timeout)
        domain_lines = []
        for table_name, col_name in candidates:
            if table_name in _EXCLUDED_TABLES:
                continue
            try:
                # Timeout per-query: 3 seconds max to avoid slow scans on large tables
                await session.execute(text("SET LOCAL statement_timeout = '3s'"))
                distinct_result = await session.execute(text(
                    f'SELECT DISTINCT "{col_name}" FROM "{table_name}" '
                    f'WHERE "{col_name}" IS NOT NULL '
                    f'ORDER BY "{col_name}" LIMIT 30'
                ))
                values = [str(row[0]) for row in distinct_result.fetchall()]
                await session.execute(text("RESET statement_timeout"))
                
                # Skip if too many values (not a real enum) or empty
                if not values or len(values) > 25:
                    continue
                    
                vals_str = ", ".join(f"'{v}'" for v in values)
                domain_lines.append(f"  {table_name}.{col_name}: {vals_str}")
            except Exception:
                pass  # Table might not be accessible, skip silently
        
        domain_str = "\n".join(domain_lines)
        _domain_cache["domain_str"] = domain_str
        _domain_cache["fetched_at"] = now
        logger.info("Domain values cached: %d enum columns discovered from base tables", len(domain_lines))
        return domain_str
        
    except Exception as e:
        logger.error("Failed to introspect domain values: %s", e)
        return ""


# ═══════════════════════════════════════════════════════════════════════════════
# DYNAMIC BUSINESS RULES — Grade points & attendance semantics from live data
# ═══════════════════════════════════════════════════════════════════════════════

# Grade-to-point mapping (JNTUH/CBCS scale). This IS business configuration —
# the point values are institutional policy, not discoverable from data.
# But the grade LETTERS are validated against what actually exists in the DB.
_GRADE_POINTS_CONFIG = {
    "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "D": 4, "F": 0,
}

# Attendance statuses that count as "attended" (institutional policy).
# Validated against actual DB values at runtime.
_ATTENDED_STATUSES = {"present", "late", "od", "medical"}

_business_rules_cache: dict = {"rules": None, "fetched_at": 0}
_BUSINESS_RULES_CACHE_TTL = 3600  # 1 hour


async def get_business_rules(session: AsyncSession) -> dict:
    """
    Dynamically builds business rule snippets from live DB data.
    
    Returns a dict with:
      - grade_points_snippet: the VALUES clause for grade-to-points JOIN
      - attended_statuses: comma-separated list of statuses that count as attended
      - not_attended_statuses: statuses that DON'T count
      - payment_success_statuses: statuses that count as successful payment
      - pass_fail_grade: which grade is 'fail'
    
    All values are validated against what actually exists in the database.
    """
    now = time.time()
    if _business_rules_cache["rules"] and (now - _business_rules_cache["fetched_at"]) < _BUSINESS_RULES_CACHE_TTL:
        return _business_rules_cache["rules"]
    
    rules = {}
    
    try:
        # 1. Grade points — query actual grades from DB, map to configured points
        try:
            result = await session.execute(text(
                "SELECT DISTINCT grade FROM semester_grades WHERE grade IS NOT NULL ORDER BY grade"
            ))
            db_grades = [row[0] for row in result.fetchall()]
        except Exception:
            db_grades = list(_GRADE_POINTS_CONFIG.keys())
        
        # Build VALUES clause only for grades that actually exist in the DB
        grade_values = []
        for grade in db_grades:
            points = _GRADE_POINTS_CONFIG.get(grade)
            if points is not None:
                grade_values.append(f"('{grade}',{points})")
            else:
                logger.warning("Unknown grade '%s' found in DB — not in _GRADE_POINTS_CONFIG", grade)
        
        if grade_values:
            rules["grade_points_snippet"] = (
                f"JOIN (VALUES {','.join(grade_values)}) AS gp(grade, points) ON sg.grade = gp.grade"
            )
            rules["fail_grade"] = "F" if "F" in db_grades else db_grades[-1] if db_grades else "F"
        else:
            # Fallback if DB is empty
            rules["grade_points_snippet"] = (
                "JOIN (VALUES ('O',10),('A+',9),('A',8),('B+',7),('B',6),('C',5),('D',4),('F',0)) "
                "AS gp(grade, points) ON sg.grade = gp.grade"
            )
            rules["fail_grade"] = "F"
        
        # 2. Attendance statuses — query actual statuses, classify as attended/not
        try:
            result = await session.execute(text(
                "SELECT DISTINCT status FROM attendance_records WHERE status IS NOT NULL ORDER BY status"
            ))
            db_att_statuses = [row[0] for row in result.fetchall()]
        except Exception:
            db_att_statuses = list(_ATTENDED_STATUSES) + ["absent"]
        
        attended = [s for s in db_att_statuses if s in _ATTENDED_STATUSES]
        not_attended = [s for s in db_att_statuses if s not in _ATTENDED_STATUSES]
        
        rules["attended_statuses"] = ",".join(f"'{s}'" for s in attended)
        rules["not_attended_statuses"] = ",".join(f"'{s}'" for s in not_attended)
        
        # 3. Payment statuses — query actual values
        try:
            result = await session.execute(text(
                "SELECT DISTINCT status FROM fee_payments WHERE status IS NOT NULL ORDER BY status"
            ))
            db_pay_statuses = [row[0] for row in result.fetchall()]
        except Exception:
            db_pay_statuses = ["success"]
        
        rules["payment_success_statuses"] = ",".join(f"'{s}'" for s in db_pay_statuses if "success" in s.lower() or "paid" in s.lower()) or "'success'"
        rules["all_payment_statuses"] = ",".join(f"'{s}'" for s in db_pay_statuses)
        
        # 4. Hostel allocation statuses
        try:
            result = await session.execute(text(
                "SELECT DISTINCT status FROM allocations WHERE status IS NOT NULL ORDER BY status"
            ))
            db_alloc_statuses = [row[0] for row in result.fetchall()]
        except Exception:
            db_alloc_statuses = ["active"]
        
        rules["active_alloc_statuses"] = ",".join(f"'{s}'" for s in db_alloc_statuses if "active" in s.lower()) or "'active'"
        
        _business_rules_cache["rules"] = rules
        _business_rules_cache["fetched_at"] = now
        logger.info("Business rules cached: %d grades, %d attendance statuses", len(grade_values), len(db_att_statuses))
        return rules
        
    except Exception as e:
        logger.error("Failed to build business rules: %s", e)
        return {
            "grade_points_snippet": "JOIN (VALUES ('O',10),('A+',9),('A',8),('B+',7),('B',6),('C',5),('D',4),('F',0)) AS gp(grade, points) ON sg.grade = gp.grade",
            "fail_grade": "F",
            "attended_statuses": "'present','late','od','medical'",
            "not_attended_statuses": "'absent'",
            "payment_success_statuses": "'success'",
            "all_payment_statuses": "'success'",
            "active_alloc_statuses": "'active'",
        }

def _build_views(col_filter: str, dept_filter: str, dept_filter_direct: str, role_upper: str) -> list[str]:
    """
    Returns the list of CREATE TEMPORARY VIEW SQL statements for the given role.
    
    Access tiers:
        ALL_ROLES:   v_students, v_departments, v_courses, v_faculty, v_faculty_assignments
        ACADEMIC:    + v_attendance, v_semester_grades, v_mark_entries, v_student_rankings,
                       v_course_feedback, v_leave_requests, v_teaching_evaluations, v_mentor_assignments
        FINANCIAL:   + v_invoices, v_payments, v_scholarship_applications
        EXAMS:       + v_quizzes, v_quiz_attempts, v_exam_schedules
        PLACEMENT:   + v_companies, v_placement_drives, v_placement_applications
        HOSTEL:      + v_hostel_allocations
        LIBRARY:     + v_library_transactions
        GOVERNANCE:  + v_grievances, v_announcements
    """
    views = []

    # ── TIER 0: Universal views (all roles) ──────────────────────────────────

    # Students
    views.append(f'''
    CREATE OR REPLACE TEMPORARY VIEW v_students AS 
        SELECT u.id, u.name, u.email, p.roll_number, p.department, p.section, 
               p.current_semester, p.batch, p.gender, p.date_of_birth,
               p.enrollment_status, p.abc_id
        FROM users u 
        JOIN user_profiles p ON u.id = p.user_id 
        WHERE u.{col_filter} {dept_filter} AND u.is_deleted = false AND UPPER(u.role) = 'STUDENT'
    ''')

    # Departments
    views.append(f'''
    CREATE OR REPLACE TEMPORARY VIEW v_departments AS
        SELECT id, name, code, hod_user_id
        FROM departments
        WHERE {col_filter} AND is_deleted = false
    ''')

    # Courses
    views.append(f'''
    CREATE OR REPLACE TEMPORARY VIEW v_courses AS
        SELECT c.id, c.name, c.subject_code, c.credits, c.semester, c.type,
               c.course_category, c.regulation_year, c.hours_per_week,
               c.lecture_hrs, c.tutorial_hrs, c.practical_hrs,
               c.is_mooc, c.mooc_platform,
               d.name AS department_name, d.code AS department_code
        FROM courses c
        JOIN departments d ON c.department_id = d.id
        WHERE c.{col_filter} AND c.is_deleted = false
    ''')

    # Faculty (users with role FACULTY/HOD)
    views.append(f'''
    CREATE OR REPLACE TEMPORARY VIEW v_faculty AS
        SELECT u.id, u.name, u.email, p.department, p.phone
        FROM users u
        JOIN user_profiles p ON u.id = p.user_id
        WHERE u.{col_filter} {dept_filter} AND u.is_deleted = false 
              AND UPPER(u.role) IN ('FACULTY', 'HOD')
    ''')

    # Faculty Assignments (who teaches what)
    views.append(f'''
    CREATE OR REPLACE TEMPORARY VIEW v_faculty_assignments AS
        SELECT fa.id, fa.teacher_id, u.name AS teacher_name, 
               fa.subject_code, fa.subject_name, fa.department, 
               fa.batch, fa.section, fa.semester, fa.academic_year,
               fa.credits, fa.hours_per_week, fa.is_lab
        FROM faculty_assignments fa
        JOIN users u ON fa.teacher_id = u.id
        WHERE fa.{col_filter} {dept_filter_direct} AND fa.is_deleted = false
    ''')

    # ── TIER 1: Academic views (not for TPO) ─────────────────────────────────

    if role_upper != "TPO":
        # Attendance
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_attendance AS 
            SELECT a.id, a.student_id, a.date, a.subject_code, a.status, 
                   a.is_late_entry, p.department, p.section
            FROM attendance_records a
            JOIN user_profiles p ON a.student_id = p.user_id
            WHERE a.{col_filter} {dept_filter} AND a.is_deleted = false
        ''')

        # Semester Grades (THE key performance table)
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_semester_grades AS
            SELECT sg.id, sg.student_id, u.name AS student_name,
                   p.roll_number, p.department, p.section, p.batch,
                   sg.semester, sg.course_id, sg.grade, sg.credits_earned,
                   sg.is_supplementary
            FROM semester_grades sg
            JOIN users u ON sg.student_id = u.id
            JOIN user_profiles p ON sg.student_id = p.user_id
            WHERE sg.{col_filter} {dept_filter} AND sg.is_deleted = false
        ''')

        # Mark Submission Entries (individual student marks per exam)
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_mark_entries AS
            SELECT mse.id, mse.student_id, u.name AS student_name,
                   p.roll_number, p.department, p.section,
                   ms.subject_code, ms.exam_type, ms.semester, ms.max_marks,
                   mse.marks_obtained, mse.status AS entry_status,
                   ms.status AS submission_status,
                   f.name AS faculty_name
            FROM mark_submission_entries mse
            JOIN mark_submissions ms ON mse.submission_id = ms.id
            JOIN users u ON mse.student_id = u.id
            JOIN user_profiles p ON mse.student_id = p.user_id
            JOIN users f ON ms.faculty_id = f.id
            WHERE ms.{col_filter} {dept_filter} AND ms.is_deleted = false
        ''')

        # Student Rankings (precomputed leaderboard — no is_deleted on this table)
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_student_rankings AS
            SELECT sr.student_id, u.name AS student_name,
                   p.roll_number, p.department, p.section, p.batch,
                   sr.rank, sr.total_students, sr.avg_score, sr.computed_at
            FROM student_rankings sr
            JOIN users u ON sr.student_id = u.id
            JOIN user_profiles p ON sr.student_id = p.user_id
            WHERE sr.{col_filter} {dept_filter}
        ''')

        # Leave Requests (faculty + student)
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_leave_requests AS
            SELECT lr.id, lr.applicant_id, u.name AS applicant_name,
                   lr.applicant_role, lr.leave_type, lr.from_date, lr.to_date,
                   lr.reason, lr.status, lr.reviewed_by, lr.created_at
            FROM leave_requests lr
            JOIN users u ON lr.applicant_id = u.id
            WHERE lr.{col_filter} AND lr.is_deleted = false
        ''')

        # Mentor Assignments
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_mentor_assignments AS
            SELECT ma.id, ma.faculty_id, f.name AS mentor_name,
                   ma.student_id, s.name AS student_name,
                   p.department, p.section, p.batch,
                   ma.academic_year, ma.is_active
            FROM mentor_assignments ma
            JOIN users f ON ma.faculty_id = f.id
            JOIN users s ON ma.student_id = s.id
            JOIN user_profiles p ON ma.student_id = p.user_id
            WHERE ma.{col_filter} {dept_filter} AND ma.is_deleted = false
        ''')

    # ── TIER 2: Feedback & Evaluations ───────────────────────────────────────

    if role_upper in ["PRINCIPAL", "HOD", "ADMIN", "SUPERADMIN", "EXAM_CELL", "FACULTY", "DHTE_NODAL", "INSTITUTIONAL_NODAL"]:
        # Course Feedback (student → faculty ratings)
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_course_feedback AS
            SELECT cf.id, cf.student_id, cf.faculty_id, 
                   f.name AS faculty_name, p.department,
                   cf.subject_code, cf.academic_year, cf.semester,
                   cf.content_rating, cf.teaching_rating, cf.engagement_rating,
                   cf.assessment_rating, cf.overall_rating
            FROM course_feedback cf
            JOIN users f ON cf.faculty_id = f.id
            JOIN user_profiles p ON cf.faculty_id = p.user_id
            WHERE cf.{col_filter} {dept_filter} AND cf.is_deleted = false
        ''')

        # Teaching Evaluations (expert → faculty ratings)
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_teaching_evaluations AS
            SELECT te.id, te.faculty_id, f.name AS faculty_name,
                   p.department, te.subject_code, te.academic_year,
                   te.content_coverage_rating, te.methodology_rating,
                   te.engagement_rating, te.assessment_quality_rating,
                   te.overall_rating, te.evaluation_date
            FROM teaching_evaluations te
            JOIN users f ON te.faculty_id = f.id
            JOIN user_profiles p ON te.faculty_id = p.user_id
            WHERE te.{col_filter} {dept_filter} AND te.is_deleted = false
        ''')

    # ── TIER 3: Exams & Assessments ──────────────────────────────────────────

    if role_upper in ["EXAM_CELL", "SUPERADMIN", "PRINCIPAL", "ADMIN", "FACULTY", "HOD", "DHTE_NODAL", "INSTITUTIONAL_NODAL"]:
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_quizzes AS
            SELECT q.id, q.title, q.type, q.status, q.total_marks, 
                   q.faculty_id, q.course_id, q.created_at
            FROM quizzes q
            WHERE q.{col_filter} AND q.is_deleted = false
        ''')
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_quiz_attempts AS
            SELECT qa.id, qa.quiz_id, qa.student_id, qa.status, 
                   qa.final_score, qa.start_time, qa.end_time
            FROM quiz_attempts qa
            WHERE qa.{col_filter} AND qa.is_deleted = false
        ''')
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_exam_schedules AS
            SELECT es.id, es.department_id, d.name AS department_name,
                   es.batch, es.semester, es.academic_year,
                   es.subject_code, es.subject_name, es.exam_date,
                   es.session, es.exam_time, es.is_published
            FROM exam_schedules es
            JOIN departments d ON es.department_id = d.id
            WHERE es.{col_filter} AND es.is_deleted = false
        ''')

    # ── TIER 4: Financial (not for TPO, Faculty, HOD) ────────────────────────

    if role_upper in ["PRINCIPAL", "ADMIN", "SUPERADMIN", "DHTE_NODAL", "INSTITUTIONAL_NODAL"]:
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_invoices AS
            SELECT i.id, i.student_id, i.fee_type, i.total_amount, 
                   i.academic_year, i.due_date, p.department, p.section
            FROM student_fee_invoices i
            JOIN user_profiles p ON i.student_id = p.user_id
            WHERE i.{col_filter} {dept_filter} AND i.is_deleted = false
        ''')
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_payments AS
            SELECT fp.id, fp.student_id, fp.invoice_id, fp.amount_paid, 
                   fp.status, fp.transaction_date, p.department, p.section
            FROM fee_payments fp
            JOIN user_profiles p ON fp.student_id = p.user_id
            WHERE fp.{col_filter} {dept_filter} AND fp.is_deleted = false
        ''')
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_scholarship_applications AS
            SELECT sa.id, sa.student_id, u.name AS student_name,
                   p.department, p.section, p.batch,
                   s.name AS scholarship_name, s.type AS scholarship_type,
                   sa.status, sa.applied_at
            FROM scholarship_applications sa
            JOIN scholarships s ON sa.scholarship_id = s.id
            JOIN users u ON sa.student_id = u.id
            JOIN user_profiles p ON sa.student_id = p.user_id
            WHERE sa.{col_filter} {dept_filter} AND sa.is_deleted = false
        ''')

    # For HOD/Faculty/ExamCell — they still get invoices/payments for their dept context
    if role_upper in ["HOD", "FACULTY", "EXAM_CELL"]:
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_invoices AS
            SELECT i.id, i.student_id, i.fee_type, i.total_amount, 
                   i.academic_year, i.due_date, p.department, p.section
            FROM student_fee_invoices i
            JOIN user_profiles p ON i.student_id = p.user_id
            WHERE i.{col_filter} {dept_filter} AND i.is_deleted = false
        ''')
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_payments AS
            SELECT fp.id, fp.student_id, fp.invoice_id, fp.amount_paid, 
                   fp.status, fp.transaction_date, p.department, p.section
            FROM fee_payments fp
            JOIN user_profiles p ON fp.student_id = p.user_id
            WHERE fp.{col_filter} {dept_filter} AND fp.is_deleted = false
        ''')

    # ── TIER 5: Placement (TPO + leadership) ─────────────────────────────────

    if role_upper in ["TPO", "SUPERADMIN", "PRINCIPAL", "ADMIN", "DHTE_NODAL", "INSTITUTIONAL_NODAL"]:
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_companies AS
            SELECT id, name, sector, website
            FROM companies
            WHERE {col_filter} AND is_deleted = false
        ''')
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_placement_drives AS
            SELECT id, company_id, role_title, drive_type, package_lpa, 
                   drive_date, status, min_cgpa, type, work_location,
                   stipend, duration_weeks
            FROM placement_drives
            WHERE {col_filter} AND is_deleted = false
        ''')
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_placement_applications AS
            SELECT a.id, a.drive_id, a.student_id, a.status, a.registered_at,
                   u.name AS student_name, p.department, p.section, p.batch
            FROM placement_applications a
            JOIN users u ON a.student_id = u.id
            JOIN user_profiles p ON a.student_id = p.user_id
            WHERE a.{col_filter} AND a.is_deleted = false
        ''')

    # ── TIER 6: Hostel & Library ─────────────────────────────────────────────

    if role_upper in ["PRINCIPAL", "ADMIN", "SUPERADMIN", "DHTE_NODAL", "INSTITUTIONAL_NODAL"]:
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_hostel_allocations AS
            SELECT al.id, al.student_id, u.name AS student_name,
                   p.department, p.section, p.batch,
                   h.name AS hostel_name, r.room_number AS room_no, r.floor,
                   b.bed_identifier AS bed_label, al.academic_year,
                   al.allocated_at, al.vacated_at, al.status
            FROM allocations al
            JOIN beds b ON al.bed_id = b.id
            JOIN rooms r ON al.room_id = r.id
            JOIN hostels h ON al.hostel_id = h.id
            JOIN users u ON al.student_id = u.id
            JOIN user_profiles p ON al.student_id = p.user_id
            WHERE al.{col_filter} AND al.is_deleted = false
        ''')

        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_library_transactions AS
            SELECT lt.id, lt.user_id AS student_id, u.name AS student_name,
                   p.department, p.section,
                   bk.title AS book_title, bk.author, bk.isbn,
                   lt.checkout_time AS issue_date, lt.due_date, 
                   lt.return_time AS return_date, lt.status,
                   lf.amount AS fine_amount
            FROM library_transactions lt
            JOIN users u ON lt.user_id = u.id
            JOIN user_profiles p ON lt.user_id = p.user_id
            JOIN book_copies bc ON lt.copy_id = bc.id
            JOIN books bk ON bc.book_id = bk.id
            LEFT JOIN library_fines lf ON lt.id = lf.transaction_id AND lf.is_deleted = false
            WHERE lt.{col_filter} AND lt.is_deleted = false
        ''')

    # ── TIER 7: Governance (grievances, announcements) ───────────────────────

    if role_upper in ["PRINCIPAL", "ADMIN", "SUPERADMIN", "DHTE_NODAL", "INSTITUTIONAL_NODAL"]:
        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_grievances AS
            SELECT g.id, g.submitted_by, u.name AS submitted_by_name,
                   g.submitted_by_role, g.category, g.subject, g.description,
                   g.status, g.is_anonymous, g.created_at
            FROM grievances g
            JOIN users u ON g.submitted_by = u.id
            WHERE g.{col_filter} AND g.is_deleted = false
        ''')

        views.append(f'''
        CREATE OR REPLACE TEMPORARY VIEW v_announcements AS
            SELECT id, title, message, priority, created_at
            FROM announcements
            WHERE {col_filter} AND is_deleted = false
        ''')

    return views


def get_view_schemas_for_prompt(role: str) -> list[str]:
    """
    Extracts the exact column schemas from the actual view definitions.
    Returns schema strings like: "- v_students(id, name, email, roll_number, department, ...)"
    
    This ensures the LLM prompt always matches the real temporary views,
    eliminating schema drift between the prompt and actual SQL.
    """
    # Use placeholder filters — we only need the column names, not the actual WHERE clauses
    views_sql = _build_views(
        col_filter="1=1",
        dept_filter="",
        dept_filter_direct="",
        role_upper=role.upper()
    )
    
    schemas = []
    for stmt in views_sql:
        # Extract view name
        name_match = re.search(r'CREATE\s+OR\s+REPLACE\s+TEMPORARY\s+VIEW\s+(\w+)', stmt, re.IGNORECASE)
        if not name_match:
            continue
        view_name = name_match.group(1)
        
        # Extract the SELECT ... FROM portion
        select_match = re.search(r'SELECT\s+(.*?)\s+FROM\s+', stmt, re.IGNORECASE | re.DOTALL)
        if not select_match:
            continue
        
        select_clause = select_match.group(1)
        
        # Parse individual column expressions and extract their final alias
        columns = []
        # Split by comma, respecting parentheses
        depth = 0
        current = []
        for ch in select_clause:
            if ch == '(':
                depth += 1
                current.append(ch)
            elif ch == ')':
                depth -= 1
                current.append(ch)
            elif ch == ',' and depth == 0:
                columns.append(''.join(current).strip())
                current = []
            else:
                current.append(ch)
        if current:
            columns.append(''.join(current).strip())
        
        # For each column, extract the alias (the last word, or the part after AS)
        col_names = []
        for col in columns:
            col = col.strip()
            if not col:
                continue
            # Check for explicit AS alias
            as_match = re.search(r'\bAS\s+(\w+)\s*$', col, re.IGNORECASE)
            if as_match:
                col_names.append(as_match.group(1))
            else:
                # No alias — take the column name (last segment after .)
                parts = col.split('.')
                col_name = parts[-1].strip()
                col_names.append(col_name)
        
        schemas.append(f"- {view_name}({', '.join(col_names)})")
    
    return schemas


async def _setup_temporary_views(session: AsyncSession, college_id: str, role: str, user_id: str):
    """Sets up GUC variables and creates role-scoped temporary views."""
    department = None
    role_upper = role.upper()
    if role_upper in ["HOD", "FACULTY"]:
        result = await session.execute(
            text("SELECT department FROM user_profiles WHERE user_id = :uid"), 
            {"uid": user_id}
        )
        row = result.fetchone()
        if row:
            department = row[0]
            
    department = department or "NONE_ASSIGNED"
        
    await session.execute(text("SELECT set_config('insights.college_id', :cid, true)"), {"cid": college_id or ''})
    await session.execute(text("SELECT set_config('insights.department', :dept, true)"), {"dept": department})
    await session.execute(text("SELECT set_config('insights.role', :role, true)"), {"role": role_upper})
    # Also set app.college_id so RLS policies enforce tenant isolation on base table queries
    await session.execute(text("SELECT set_config('app.college_id', :cid, true)"), {"cid": college_id or ''})

    if role_upper == "SUPERADMIN":
        col_filter = " 1=1 "
    else:
        col_filter = " college_id = current_setting('insights.college_id')"

    if role_upper in ["HOD", "FACULTY"]:
        dept_filter = " AND p.department = current_setting('insights.department')"
        # For views that have their own department column (no user_profiles join)
        dept_filter_direct = " AND department = current_setting('insights.department')"
    else:
        dept_filter = ""
        dept_filter_direct = ""

    # Build all views for this role
    views_sql = _build_views(col_filter, dept_filter, dept_filter_direct, role_upper)

    # Execute each view creation individually (asyncpg requires single-statement execution)
    for view_stmt in views_sql:
        await session.execute(text(view_stmt.strip()))


def validate_sql_safety(sql: str):
    """Raises ValueError if SQL contains unsafe operations."""
    # Ensure they only query the v_ views or basic functions
    # Using regex to look for destructive patterns
    upper_sql = sql.upper()
    for pattern in UNSAFE_PATTERNS:
        if re.search(pattern, upper_sql):
            logger.warning(f"BLOCKED SQL: Contains unsafe pattern {pattern}")
            raise ValueError("Query rejected: Blocked keyword or character detected.")
            
    # Verify there's at least a SELECT
    if "SELECT" not in upper_sql:
        raise ValueError("Query rejected: Only SELECT queries are allowed.")
    
    # Check for embedded semicolons (multi-statement injection), ignore trailing
    stripped = upper_sql.strip().rstrip(";")
    if ";" in stripped:
        logger.warning("BLOCKED SQL: Contains embedded semicolons (multi-statement)")
        raise ValueError("Query rejected: Blocked keyword or character detected.")


async def execute_insights_query(session: AsyncSession, sql_query: str, college_id: str, role: str, user_id: str) -> dict:
    """
    Executes a raw SQL generated by the LLM securely.
    1. Validates the SQL string
    2. Opens a subtransaction (savepoint) just in case
    3. Enforces READ ONLY
    4. Sets up v_* Temp Views
    5. Validates department scope for HOD/FACULTY
    6. Wraps query with LIMIT 1000
    7. Returns data and columns
    """
    # Clean SQL BEFORE validation: strip markdown fences and trailing semicolons
    clean_sql = sql_query.strip()
    if clean_sql.startswith("```"):
        clean_sql = re.sub(r"^```(?:sql)?\s*", "", clean_sql, flags=re.IGNORECASE)
        clean_sql = re.sub(r"\s*```$", "", clean_sql, flags=re.IGNORECASE)
    clean_sql = clean_sql.strip().rstrip(";")
    
    # Sanitize: strip trailing empty ORDER BY (LLM sometimes generates "ORDER BY)" or "ORDER BY")
    clean_sql = re.sub(r'\s+ORDER\s+BY\s*\)', ')', clean_sql, flags=re.IGNORECASE)
    clean_sql = re.sub(r'\s+ORDER\s+BY\s*$', '', clean_sql, flags=re.IGNORECASE)
    
    # Auto-fix: PostgreSQL ROUND(double precision, int) does not exist.
    # LLMs consistently generate ROUND(expr * 100.0 / ..., 2) which produces double precision.
    # Fix: inject ::NUMERIC cast before the precision argument.
    # Uses parenthesis-depth tracking to find the correct outer comma.
    def _fix_all_rounds(sql_text):
        upper = sql_text.upper()
        result = []
        i = 0
        while i < len(sql_text):
            # Look for ROUND(
            if upper[i:i+5] == 'ROUND' and i + 5 < len(sql_text):
                # Skip whitespace after ROUND
                j = i + 5
                while j < len(sql_text) and sql_text[j] in ' \t\n\r':
                    j += 1
                if j < len(sql_text) and sql_text[j] == '(':
                    # Found ROUND( — now find the matching outer comma and closing paren
                    paren_start = j
                    depth = 1
                    k = j + 1
                    comma_pos = -1
                    while k < len(sql_text) and depth > 0:
                        ch = sql_text[k]
                        if ch == '(':
                            depth += 1
                        elif ch == ')':
                            depth -= 1
                        elif ch == ',' and depth == 1 and comma_pos == -1:
                            comma_pos = k
                        k += 1
                    # k is now one past the closing paren
                    if comma_pos > 0 and depth == 0:
                        expr_part = sql_text[paren_start + 1:comma_pos].strip()
                        prec_part = sql_text[comma_pos + 1:k - 1].strip()
                        if expr_part.upper().rstrip().endswith('::NUMERIC'):
                            result.append(sql_text[i:k])
                        else:
                            result.append(f'ROUND(({expr_part})::NUMERIC, {prec_part})')
                        i = k
                        continue
            result.append(sql_text[i])
            i += 1
        return ''.join(result)
    
    clean_sql = _fix_all_rounds(clean_sql)
    
    # Detect truncated CASE statements (LLM token-limit cuts mid-CASE)
    # Pattern: "WHEN <value> THEN <value> WHEN)" or "WHEN <value> THEN <value> WHEN,"
    # These indicate the LLM ran out of tokens while generating a CASE block.
    truncated_case_pattern = re.compile(
        r'WHEN\s*\)?[\s,;]*$'            # ends with dangling WHEN)
        r'|WHEN\s+\'[^\']*\'\s*\)'       # WHEN 'value')  — missing THEN
        r'|THEN\s+\d+\s+WHEN\s*\)',      # THEN 8 WHEN)   — truncated mid-block
        re.IGNORECASE
    )
    if truncated_case_pattern.search(clean_sql):
        raise ValueError(
            "The query was too complex and got truncated. "
            "Please try a simpler question or break it into smaller parts."
        )
    
    validate_sql_safety(clean_sql)
    
    # ── Department scope validation for HOD/FACULTY on base table queries ────
    # If query references base tables (not just v_ views), HOD/FACULTY must
    # have a department filter. This is the (B) defense layer.
    role_upper = role.upper()
    if role_upper in ["HOD", "FACULTY"]:
        _validate_department_scope(clean_sql, session, user_id)
    
    # Wrap as subquery to ensure it executes cleanly, capped at 500 rows for performance and safety.
    limited_sql = f"SELECT * FROM ({clean_sql}) AS _llm_q LIMIT 500"

    from database import AsyncSessionLocal
    
    try:
        # Create a completely isolated database session to prevent any aborted 
        # transactions from bleeding into the parent FastAPI request session.
        async with AsyncSessionLocal() as isolated_session:
            async with isolated_session.begin():
                # 1. Setup GUC variables and create scoped temp views
                await _setup_temporary_views(isolated_session, college_id, role, user_id)
                
                # 2. Safety: timeout guard for LLM-generated queries (5s max)
                await isolated_session.execute(text("SET LOCAL statement_timeout = '5s'"))
                
                # 3. Execute the LLM query (safety enforced by validate_sql_safety + temp view scope)
                logger.info(f"Executing LLM Query for user {user_id}: {limited_sql}")
                result = await isolated_session.execute(text(limited_sql))
                
                # 4. Fetch columns and rows
                keys = result.keys()
                columns = list(keys)
                
                rows = result.fetchall()
                data = [dict(zip(keys, row)) for row in rows]
                
                return {
                    "columns": columns,
                    "data": data
                }
            
    except Exception as e:
        import traceback
        logger.error(f"Error executing insights query: {type(e).__name__}: {e}\n{traceback.format_exc()}")
        raise ValueError(f"Failed to execute query: {type(e).__name__}: {str(e)}")


def _validate_department_scope(sql: str, session: AsyncSession, user_id: str):
    """
    Post-validation: For HOD/FACULTY roles, if the SQL queries base tables
    (not just v_ views), verify that a department filter is present.
    
    This is the (B) defense layer — even if the LLM ignores the prompt constraint,
    we block the query at execution time.
    """
    upper_sql = sql.upper()
    
    # Extract all table/view references from FROM and JOIN clauses
    # Pattern: FROM tablename, JOIN tablename
    table_refs = re.findall(
        r'(?:FROM|JOIN)\s+(\w+)',
        upper_sql
    )
    
    # Check if any reference is NOT a v_ view
    has_base_table = any(
        not ref.startswith('V_') and ref not in ('VALUES', 'LATERAL', 'GENERATE_SERIES')
        for ref in table_refs
    )
    
    if not has_base_table:
        return  # All references are v_ views — they handle department filtering
    
    # Base table detected — verify department filter exists
    has_dept_filter = bool(re.search(
        r"department\s*=\s*'[^']+'"     # department = 'CSE'
        r"|department\s*=\s*current_setting"  # department = current_setting(...)
        r"|p\.department\s*=",           # p.department = ...
        upper_sql,
        re.IGNORECASE
    ))
    
    if not has_dept_filter:
        logger.warning(
            "BLOCKED: HOD/FACULTY query on base tables without department filter. "
            f"User: {user_id}, SQL: {sql[:200]}"
        )
        raise ValueError(
            "This query accesses base tables without department filtering. "
            "For security, your queries on base tables must include a department filter. "
            "Please rephrase your question or use the pre-built views."
        )
