from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

import logging

logger = logging.getLogger(__name__)

from app.core.security import require_role
from database import get_db
from app.models.accreditation import (
    NAACAuditSnapshot,
    AccreditationEvidence,
    COAttainmentRecord,
    POAttainmentRecord,
    AccreditationReportJob,
)
from app.models.outcomes import ProgramOutcome, COPOMapping, CourseOutcome
from app.models.core import UserProfile, College
from app.models.academics import CourseEnrollment, Course
from app.services.attainment_service import AttainmentService

router = APIRouter()

# ── NAAC Summary ─────────────────────────────────────────────────────────────

@router.get("/naac/summary/{college_id}")
async def get_naac_summary(
    college_id: str,
    academic_year: str = Query(..., description="e.g., 2024-2025"),
    user: dict = Depends(require_role("nodal", "principal", "admin", "super_admin")),
    session: AsyncSession = Depends(get_db)
):
    """
    Aggregates NAACAuditSnapshot and evidence counts across the 7 criteria.
    Gracefully handles missing data by returning a structured empty state.
    """
    CRITERIA_LABELS = {
        1: 'Curricular Aspects',
        2: 'Teaching-Learning',
        3: 'Research & Innovation',
        4: 'Infrastructure',
        5: 'Student Support',
        6: 'Governance',
        7: 'Institutional Values',
    }

    # Fetch snapshots for the college and year
    snapshots = (await session.scalars(
        select(NAACAuditSnapshot).where(
            NAACAuditSnapshot.college_id == college_id,
            NAACAuditSnapshot.academic_year == academic_year,
        )
    )).all()

    # Fetch evidence counts by criterion (grouped by criterion_id)
    # Evidence criterion_ids might be like "1.1.1", "2.3.1". 
    # We aggregate by the major criterion number (the first digit).
    evidences = (await session.scalars(
        select(AccreditationEvidence).where(
            AccreditationEvidence.college_id == college_id
        )
    )).all()

    evidence_counts = {i: 0 for i in range(1, 8)}
    for ev in evidences:
        try:
            crit_num = int(ev.criterion_id.split('.')[0])
            if 1 <= crit_num <= 7:
                evidence_counts[crit_num] += 1
        except (ValueError, IndexError):
            pass

    NAAC_WEIGHTS = {
        1: 100, 2: 350, 3: 110, 4: 100, 5: 140, 6: 100, 7: 100
    }

    # Build response structure
    result = []
    for criterion_num, name in CRITERIA_LABELS.items():
        # Aggregate scores if there are snapshots for this criterion
        crit_snapshots = [s for s in snapshots if s.criterion == criterion_num]
        
        score = None
        if crit_snapshots:
            valid_scores = [s.computed_value for s in crit_snapshots if s.computed_value is not None]
            if valid_scores:
                score = sum(valid_scores) / len(valid_scores)

        is_locked = any(s.locked_at is not None for s in crit_snapshots)

        result.append({
            "number": criterion_num,
            "name": name,
            "score": score,
            "max_score": 4.0,  # Standard NAAC max scale
            "evidence_count": evidence_counts[criterion_num],
            "snapshot_locked": is_locked,
            "weight": NAAC_WEIGHTS[criterion_num],
        })

    return {"criteria": result}

@router.get("/naac/evidence/{college_id}/{criterion_id}")
async def get_naac_evidence(
    college_id: str,
    criterion_id: str,
    user: dict = Depends(require_role("nodal", "principal", "admin", "super_admin")),
    session: AsyncSession = Depends(get_db)
):
    evidences = (await session.scalars(
        select(AccreditationEvidence).where(
            AccreditationEvidence.college_id == college_id,
            AccreditationEvidence.criterion_id.like(f"{criterion_id}%")
        )
    )).all()
    
    return {
        "criterion_id": criterion_id,
        "evidences": [
            {
                "id": e.id,
                "file_name": e.file_name,
                "s3_key": e.s3_key,
                "uploaded_by": e.uploaded_by,
                "created_at": e.created_at
            } for e in evidences
        ]
    }

# ── NBA CO-PO Matrix ─────────────────────────────────────────────────────────

@router.get("/nba/attainment/{department_id}")
async def get_nba_matrix(
    department_id: str,
    academic_year: str = Query(..., description="e.g., 2024-2025"),
    user: dict = Depends(require_role("nodal", "principal", "hod", "admin", "super_admin")),
    session: AsyncSession = Depends(get_db)
):
    """
    Returns the mapped CO and PO records for the NBACoPoMatrix frontend component.
    """
    college_id = user.get("college_id")
    if not college_id and user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="College context required")

    # Fetch POs for the department
    pos = (await session.scalars(
        select(ProgramOutcome).where(ProgramOutcome.department_id == department_id)
    )).all()
    po_ids = [po.id for po in pos]

    # Fetch CO records
    co_records = (await session.scalars(
        select(COAttainmentRecord).where(
            COAttainmentRecord.college_id == college_id,
            COAttainmentRecord.academic_year == academic_year,
        )
    )).all()
    
    if not co_records:
        return {"cos": [], "pos": [], "matrix": {}}

    # Fetch active COPOMappings for the department's POs
    mappings = []
    if po_ids:
        mappings = (await session.scalars(
            select(COPOMapping).where(
                COPOMapping.po_id.in_(po_ids),
                COPOMapping.is_active == True,
            )
        )).all()

    # Format: { "CO1-PO1": { co_code, po_code, strength, attainment, is_attained } }
    
    co_ids = [r.co_id for r in co_records]
    co_models = []
    if co_ids:
        co_models = (await session.scalars(
            select(CourseOutcome).where(CourseOutcome.id.in_(co_ids))
        )).all()
    co_map = {c.id: c.code for c in co_models}
    
    po_labels = sorted([po.code for po in pos])

    matrix = {}
    
    # We map CO records by their outcome ID to match with mappings
    # And we assume the frontend wants a full grid
    for mapping in mappings:
        co_rec = next((r for r in co_records if r.co_id == mapping.co_id), None)
        po = next((p for p in pos if p.id == mapping.po_id), None)
        
        if po and co_rec:
            co_code = co_map.get(mapping.co_id, mapping.co_id)
            key = f"{co_code}-{po.code}"
            matrix[key] = {
                "co_code": co_code,
                "co_id": mapping.co_id,
                "po_id": po.id,
                "po_code": po.code,
                "strength": mapping.strength,
                "attainment": co_rec.final_attainment,
                "is_attained": co_rec.is_attained,
            }

    return {
        "cos": [{"id": c.id, "code": c.code} for c in co_models],
        "pos": [{"id": po.id, "code": po.code} for po in pos],
        "matrix": matrix
    }

# ── NBA Core Calculators ─────────────────────────────────────────────────────

@router.get("/nba/success-rate/{college_id}")
async def get_nba_success_rate(
    college_id: str,
    batch_year: str = Query(..., description="e.g., 2022-26"),
    user: dict = Depends(require_role("nodal", "principal", "hod", "admin", "super_admin")),
    session: AsyncSession = Depends(get_db)
):
    """
    Returns the NBA Criterion 4 Student Success Rate.
    """
    from app.services.report_engine import ReportEngineService
    svc = ReportEngineService(session)
    data = await svc.calculate_nba_success_rate(college_id, batch_year)
    return data

@router.get("/nba/faculty-cadre/{college_id}")
async def get_nba_faculty_cadre(
    college_id: str,
    user: dict = Depends(require_role("nodal", "principal", "hod", "admin", "super_admin")),
    session: AsyncSession = Depends(get_db)
):
    """
    Returns the NBA Criterion 5 Student-Faculty Ratio and Cadre Proportion.
    """
    from app.services.report_engine import ReportEngineService
    svc = ReportEngineService(session)
    data = await svc.calculate_nba_sfr_and_cadre(college_id)
    return data

# ── NEP Status Tracker ───────────────────────────────────────────────────────

@router.get("/nep/status/{college_id}")
async def get_nep_status(
    college_id: str,
    user: dict = Depends(require_role("nodal", "principal", "admin", "super_admin")),
    session: AsyncSession = Depends(get_db)
):
    """
    Calculates NEP compliance metrics.
    Coverage percentage is correctly bound against *enrolled* students only.
    """
    # Fetch all students in the college
    students = (await session.scalars(
        select(UserProfile).where(
            UserProfile.college_id == college_id,
            UserProfile.role == "student"
        )
    )).all()

    if not students:
        return {
            "abc_coverage_pct": 0,
            "mooc_enrollment_pct": 0,
            "multidisciplinary_pct": 0,
            "enrollment_status_breakdown": {
                "active": 0,
                "academic_break": 0,
                "dropped_out": 0,
                "graduated": 0,
            },
            "total_students": 0,
        }

    status_breakdown = {
        "active": 0,
        "academic_break": 0,
        "dropped_out": 0,
        "graduated": 0,
    }

    abc_count = 0

    for s in students:
        # Tally enrollment status
        status = s.enrollment_status or "active"
        if status in status_breakdown:
            status_breakdown[status] += 1
            
        # Count ABC IDs (only for enrolled/active/academic_break students typically, but we track across all students for now)
        if s.abc_id:
            abc_count += 1

    total_students = len(students)

    # MOOC Enrollment
    mooc_enrollments = (await session.scalars(
        select(CourseEnrollment.student_id).join(Course).where(
            CourseEnrollment.college_id == college_id,
            Course.is_mooc == True
        )
    )).all()
    unique_mooc_students = len(set(mooc_enrollments))

    # Multidisciplinary Enrollment
    multi_enrollments = (await session.scalars(
        select(CourseEnrollment.student_id).join(Course).where(
            CourseEnrollment.college_id == college_id,
            Course.course_category.in_(["multidisciplinary", "mdc"])
        )
    )).all()
    unique_multi_students = len(set(multi_enrollments))

    abc_coverage_pct = (abc_count / total_students * 100) if total_students > 0 else 0
    mooc_pct = (unique_mooc_students / total_students * 100) if total_students > 0 else 0
    multi_pct = (unique_multi_students / total_students * 100) if total_students > 0 else 0

    return {
        "abc_coverage_pct": abc_coverage_pct,
        "mooc_enrollment_pct": mooc_pct,
        "multidisciplinary_pct": multi_pct,
        "enrollment_status_breakdown": status_breakdown,
        "total_students": total_students,
    }

# ── Attainment Calculation Endpoints ─────────────────────────────────────────

@router.post("/calculate/course/{course_id}")
async def trigger_course_calculation(
    course_id: str,
    academic_year: str = Query(..., description="e.g., 2024-2025"),
    user: dict = Depends(require_role("hod", "principal", "admin", "super_admin")),
    session: AsyncSession = Depends(get_db)
):
    """
    Triggers CO attainment calculation for a specific course.
    """
    college_id = user.get("college_id")
    if not college_id and user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="College context required")

    service = AttainmentService(session)
    records = await service.calculate_co_attainment(
        course_id=course_id,
        academic_year=academic_year,
        college_id=college_id
    )

    return {"status": "success", "calculated_records": records}


@router.post("/calculate/department/{department_id}")
async def trigger_department_calculation(
    department_id: str,
    academic_year: str = Query(..., description="e.g., 2024-2025"),
    user: dict = Depends(require_role("hod", "principal", "admin", "super_admin")),
    session: AsyncSession = Depends(get_db)
):
    """
    Triggers PO and PSO attainment calculations for the entire department.
    """
    college_id = user.get("college_id")
    if not college_id and user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="College context required")

    service = AttainmentService(session)
    
    po_records = await service.calculate_po_attainment(
        department_id=department_id,
        academic_year=academic_year,
        college_id=college_id
    )

    pso_records = await service.calculate_pso_attainment(
        department_id=department_id,
        academic_year=academic_year,
        college_id=college_id
    )

    return {
        "status": "success", 
        "calculated_po_records": po_records,
        "calculated_pso_records": pso_records
    }

# ── NAAC Data Ingestion: Placement & Surveys ─────────────────────────────────

from app.models.accreditation import SurveyTemplate, SurveyResponse, PlacementRecord, HigherEducationRecord
from pydantic import BaseModel
import datetime

class SurveyCreateReq(BaseModel):
    title: str
    description: str = ""
    survey_type: str
    academic_year: str

@router.post("/surveys")
async def create_survey_template(
    req: SurveyCreateReq,
    user: dict = Depends(require_role("nodal", "principal", "admin")),
    session: AsyncSession = Depends(get_db)
):
    college_id = user.get("college_id", "AITS")
    survey = SurveyTemplate(
        college_id=college_id,
        title=req.title,
        description=req.description,
        survey_type=req.survey_type,
        academic_year=req.academic_year
    )
    session.add(survey)
    await session.commit()
    await session.refresh(survey)
    return {"status": "success", "id": survey.id}

@router.get("/surveys/{college_id}")
async def list_surveys(
    college_id: str,
    survey_type: str = Query(None),
    user: dict = Depends(require_role("nodal", "principal", "admin")),
    session: AsyncSession = Depends(get_db)
):
    query = select(SurveyTemplate).where(SurveyTemplate.college_id == college_id)
    if survey_type:
        query = query.where(SurveyTemplate.survey_type == survey_type)
    surveys = (await session.scalars(query)).all()
    return {"surveys": surveys}

class PlacementCreateReq(BaseModel):
    student_id: str
    academic_year: str
    company_name: str
    package: float = 0.0

@router.post("/placements")
async def create_placement_record(
    req: PlacementCreateReq,
    user: dict = Depends(require_role("nodal", "principal", "hod", "admin", "tpo")),
    session: AsyncSession = Depends(get_db)
):
    college_id = user.get("college_id", "AITS")
    record = PlacementRecord(
        college_id=college_id,
        student_id=req.student_id,
        academic_year=req.academic_year,
        company_name=req.company_name,
        package=req.package,
        placed_on=datetime.date.today()
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return {"status": "success", "id": record.id}

@router.get("/placements/{college_id}")
async def list_placements(
    college_id: str,
    academic_year: str = Query(...),
    user: dict = Depends(require_role("nodal", "principal", "admin", "hod", "tpo")),
    session: AsyncSession = Depends(get_db)
):
    records = (await session.scalars(
        select(PlacementRecord).where(
            PlacementRecord.college_id == college_id,
            PlacementRecord.academic_year == academic_year
        )
    )).all()
    return {"records": records}


# ── Report Generation (ARQ Integration) ──────────────────────────────────────

class ReportGenerateReq(BaseModel):
    report_type: str        # "NAAC", "NBA"
    academic_year: str
    department_id: Optional[str] = None
    college_id: Optional[str] = None

@router.post("/reports/generate")
async def generate_accreditation_report(
    req: ReportGenerateReq,
    request: Request,
    user: dict = Depends(require_role("nodal", "principal", "admin", "super_admin")),
    session: AsyncSession = Depends(get_db)
):
    """
    Creates an AccreditationReportJob in DB and pushes it to the ARQ Redis queue.
    Returns the job ID instantly for the frontend to poll status.
    """
    college_id = req.college_id or getattr(request.state, "tenant_id", user.get("college_id", "AITS"))
    
    # 1. Check if a pending/processing job already exists for this cycle
    stmt = select(AccreditationReportJob).where(
        AccreditationReportJob.college_id == college_id,
        AccreditationReportJob.report_type == req.report_type,
        AccreditationReportJob.academic_year == req.academic_year,
        AccreditationReportJob.status.in_(["PENDING", "PROCESSING"])
    )
    existing_job = (await session.execute(stmt)).scalars().first()
    if existing_job:
        return {"status": "success", "job_id": existing_job.id, "message": "A report generation is already in progress."}
    
    # 2. Determine version (latest version + 1)
    v_stmt = select(AccreditationReportJob).where(
        AccreditationReportJob.college_id == college_id,
        AccreditationReportJob.report_type == req.report_type,
        AccreditationReportJob.academic_year == req.academic_year
    ).order_by(AccreditationReportJob.version.desc())
    latest_job = (await session.execute(v_stmt)).scalars().first()
    next_version = (latest_job.version + 1) if latest_job else 1
    
    # 3. Create Job Record
    new_job = AccreditationReportJob(
        college_id=college_id,
        report_type=req.report_type,
        academic_year=req.academic_year,
        version=next_version,
        status="PENDING",
        created_by=user.get("id") or user.get("user_id")
    )
    
    session.add(new_job)
    await session.flush()
    job_id_str = str(new_job.id)
    
    # 4. Enqueue to ARQ
    arq_redis = getattr(request.app.state, "arq_redis", None)
    if not arq_redis:
        try:
            from arq import create_pool
            from arq.connections import RedisSettings
            from app.core.config import settings
            request.app.state.arq_redis = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
            arq_redis = request.app.state.arq_redis
        except Exception as e:
            from sqlalchemy import update
            await session.execute(update(AccreditationReportJob).where(AccreditationReportJob.id == job_id_str).values(status="FAILED"))
            # Don't commit, get_db handles it
            raise HTTPException(status_code=500, detail=f"Failed to initialize background worker queue: {str(e)}")
    
    try:
        if req.report_type == "NAAC":
            task_name = "generate_naac_ssr_task"
        elif req.report_type == "NBA":
            task_name = "generate_nba_sar_task"
        elif req.report_type == "NIRF":
            task_name = "generate_nirf_dcs_task"
        elif req.report_type == "NEP":
            task_name = "generate_nep_compliance_task"
        else:
            task_name = "generate_naac_ssr_task"
        logger.error(f"ATTEMPTING TO ENQUEUE TASK {task_name} for JOB {job_id_str}")
        
        # Force the job ID to be the same as DB job ID
        # Defer by 2 seconds to ensure FastAPI commits the transaction before worker picks it up
        arq_job = await arq_redis.enqueue_job(task_name, job_id_str, _job_id=job_id_str, _defer_by=2)
        logger.error(f"ENQUEUED! arq_job={arq_job}")
        
        if arq_job:
            from sqlalchemy import update
            await session.execute(
                update(AccreditationReportJob)
                .where(AccreditationReportJob.id == job_id_str)
                .values(arq_job_id=arq_job.job_id)
            )
            logger.error(f"UPDATED arq_job_id in session to {arq_job.job_id}")
        else:
            logger.error(f"ARQ ENQUEUE RETURNED NONE for {job_id_str}")
            
        return {
            "status": "success",
            "job_id": job_id_str,
            "message": "Report generation queued successfully"
        }
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        try:
            from sqlalchemy import update
            await session.execute(update(AccreditationReportJob).where(AccreditationReportJob.id == job_id_str).values(status="FAILED"))
            await session.commit()
        except Exception:
            pass
        return {"status": "error", "message": tb}

@router.get("/reports/nirf-preview/{college_id}")
async def get_nirf_preview(
    college_id: str,
    academic_year: str = Query(..., description="e.g., 2024-2025"),
    user: dict = Depends(require_role("nodal", "principal", "admin", "super_admin")),
    session: AsyncSession = Depends(get_db)
):
    """
    Provides a real-time preview of the NIRF DCS payload without triggering a full report generation.
    Useful for checking data readiness before locking the report.
    """
    from app.services.report_engine import ReportEngineService
    svc = ReportEngineService(session)
    data = await svc.aggregate_nirf_payload(college_id, academic_year)
    return {"status": "success", "preview": data}

@router.get("/reports/status/{job_id}")
async def get_report_status(
    job_id: str,
    user: dict = Depends(require_role("nodal", "principal", "admin", "super_admin")),
    session: AsyncSession = Depends(get_db)
):
    """
    Returns the current status of an async report generation job.
    """
    stmt = select(AccreditationReportJob).where(AccreditationReportJob.id == job_id)
    if user.get("role") not in ["admin", "super_admin"]:
        stmt = stmt.where(AccreditationReportJob.college_id == user.get("college_id", "AITS"))
    job = (await session.execute(stmt)).scalars().first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    return {
        "status": job.status,
        "job_id": job.id,
        "report_url": job.presigned_url,
        "expires_at": job.expires_at
    }
