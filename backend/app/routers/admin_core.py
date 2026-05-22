"""
Admin Router — thin HTTP layer delegating to AdminService.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.core.security import require_role
from app.schemas.users import ProfileReview
from app.services.admin_service import AdminService
from app.services import admin_ami_service

router = APIRouter()


def get_admin_service(session: AsyncSession = Depends(get_db)):
    return AdminService(session)


@router.get("/admin/ami/context-map")
async def get_admin_ami_context_map(
    admin: dict = Depends(require_role("admin", "principal", "super_admin")),
    session: AsyncSession = Depends(get_db),
):
    return await admin_ami_service.get_context_map(admin, session)


@router.post("/admin/ami/query")
async def query_admin_ami(
    req: dict = Body(...),
    admin: dict = Depends(require_role("admin", "principal", "super_admin")),
    session: AsyncSession = Depends(get_db),
):
    return await admin_ami_service.answer_query(req.get("message", ""), admin, session)


@router.post("/admin/ami/action-preview")
async def preview_admin_ami_action(
    req: dict = Body(...),
    admin: dict = Depends(require_role("admin", "principal", "super_admin")),
    session: AsyncSession = Depends(get_db),
):
    return await admin_ami_service.preview_action(req.get("action", ""), req.get("payload") or {}, admin, session)


@router.get("/admin/reports/faculty-research")
async def get_faculty_research_report(
    user: dict = Depends(require_role("admin", "principal")),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.get_faculty_research_report(user["college_id"])


@router.get("/admin/staff-profiles/pending")
async def get_pending_staff_profiles(
    admin: dict = Depends(require_role("admin", "super_admin")),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.get_pending_staff_profiles(admin["college_id"])


@router.put("/admin/staff-profiles/{user_id}/review")
async def review_staff_profile(
    user_id: str,
    req: ProfileReview,
    admin: dict = Depends(require_role("admin", "super_admin")),
    svc: AdminService = Depends(get_admin_service)
):
    await svc.review_staff_profile(
        admin["college_id"], user_id, req.section, req.record_index, req.action, req.remarks
    )
    return {"message": "Profile record reviewed"}


@router.get("/admin/registration-windows/{window_id}/unregistered")
async def get_unregistered_students(
    window_id: str,
    admin: dict = Depends(require_role("admin", "super_admin", "exam_cell")),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.get_unregistered_students(admin["college_id"], window_id)


@router.get("/admin/activity-reports")
async def get_activity_reports(
    admin: dict = Depends(require_role("admin", "super_admin")),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.get_post_activity_reports(admin["college_id"])


@router.get("/admin/dashboard-stats")
async def get_admin_dashboard_stats(
    admin: dict = Depends(require_role("admin", "super_admin")),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.get_dashboard_stats(admin["college_id"])


@router.get("/admin/reports/alumni-outcomes")
async def get_alumni_outcomes(
    user: dict = Depends(require_role("admin", "nodal_officer", "super_admin")),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.get_alumni_outcomes(user["college_id"])


@router.post("/admin/parents/link")
async def link_parent_student(
    req: dict = Body(...),
    user: dict = Depends(require_role("admin", "nodal_officer", "super_admin")),
    svc: AdminService = Depends(get_admin_service)
):
    await svc.create_parent_link(user["college_id"], req)
    return {"message": "Parent-student link created"}


@router.get("/admin/parents/links")
async def list_parent_links(
    user: dict = Depends(require_role("admin", "nodal_officer", "super_admin")),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.get_parent_links(user["college_id"])


@router.get("/admin/grievances")
async def admin_grievances(
    status: Optional[str] = None,
    role: Optional[str] = None,
    user: dict = Depends(require_role("admin", "nodal_officer", "super_admin", "hod", "principal")),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.get_grievances(user["college_id"], status, role)


@router.put("/admin/grievances/{grievance_id}/resolve")
async def resolve_grievance(
    grievance_id: str,
    req: dict = Body(...),
    user: dict = Depends(require_role("admin", "nodal_officer", "super_admin", "hod")),
    svc: AdminService = Depends(get_admin_service)
):
    status = await svc.resolve_grievance(user["college_id"], user["id"], grievance_id, req)
    return {"message": f"Grievance marked as {status}"}


@router.get("/admin/reports/retired-faculty-research")
async def get_retired_faculty_research_report(
    user: dict = Depends(require_role("admin", "principal")),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.get_retired_faculty_research_report(user["college_id"])


@router.get("/admin/reports/consultancy")
async def get_consultancy_report(
    user: dict = Depends(require_role("admin", "principal")),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.get_consultancy_report(user["college_id"])


@router.get("/admin/export")
async def export_college_data(
    admin: dict = Depends(require_role("admin", "principal", "super_admin")),
    svc: AdminService = Depends(get_admin_service)
):
    """
    Export all college data as a structured Zip file. Unblocks enterprise offboarding deals.
    """
    return await svc.export_college_data(admin["college_id"])


@router.get("/admin/college/settings")
async def get_college_settings(
    admin: dict = Depends(require_role("admin", "principal")),
    session: AsyncSession = Depends(get_db)
):
    from app.models.core import College
    from sqlalchemy.future import select
    from fastapi import HTTPException
    
    result = await session.execute(select(College).where(College.id == admin["college_id"]))
    college = result.scalars().first()
    if not college:
        raise HTTPException(status_code=404, detail="College not found")
        
    return {"settings": college.settings or {}}


@router.put("/admin/college/settings")
async def update_college_settings(
    settings: dict = Body(...),
    admin: dict = Depends(require_role("admin", "principal")),
    session: AsyncSession = Depends(get_db)
):
    from app.models.core import College
    from sqlalchemy.future import select
    from fastapi import HTTPException
    
    # Fetch college
    result = await session.execute(select(College).where(College.id == admin["college_id"]))
    college = result.scalars().first()
    if not college:
        raise HTTPException(status_code=404, detail="College not found")
        
    # Update settings
    current_settings = college.settings or {}
    for k, v in settings.items():
        current_settings[k] = v
        
    college.settings = current_settings
    
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(college, "settings")
    
    await session.commit()
    return {"message": "College settings updated", "settings": current_settings}


def get_gdpr_service(session: AsyncSession = Depends(get_db)):
    from app.services.gdpr_service import GDPRService
    return GDPRService(session)

@router.delete("/admin/gdpr-forget/{target_user_id}")
async def anonymize_user_data(
    target_user_id: str,
    admin: dict = Depends(require_role("admin", "super_admin")),
    gdpr_svc: "GDPRService" = Depends(get_gdpr_service)
):
    """
    Executes GDPR Right to Erasure cryptographic scrub on a user's PII.
    """
    await gdpr_svc.anonymize_user(admin["college_id"], target_user_id)
    return {"message": "User PII successfully anonymized while preserving aggregate references."}

@router.post("/admin/hostel/reconcile-admissions")
async def reconcile_admissions(
    dry_run: bool = Query(False, description="Preview count before committing"),
    admin: dict = Depends(require_role("admin", "super_admin")),
    session: AsyncSession = Depends(get_db)
):
    """
    Batch endpoint to bridge Pre-Enrollment with Student Identity.
    Queries all Allocations linked to an admission, checks if they have successfully
    completed the platform onboarding (user_id is not null), and atomically 
    transfers the allocation ownership before severing the pre-enroll admission tie.
    """
    from app.models.hostel import Allocation
    from app.models.admissions import Admission
    
    allocations_stmt = select(Allocation).where(
        Allocation.college_id == admin["college_id"],
        Allocation.admission_id != None,
        Allocation.student_id == None
    )
    result = await session.execute(allocations_stmt)
    unreconciled = result.scalars().all()
    
    match_count = 0
    
    for alloc in unreconciled:
        adm_stmt = select(Admission).where(Admission.id == alloc.admission_id)
        adm_result = await session.execute(adm_stmt)
        adm = adm_result.scalars().first()
        
        if adm and adm.user_id:
            match_count += 1
            if not dry_run:
                alloc.student_id = adm.user_id
                alloc.admission_id = None
                
    if not dry_run and match_count > 0:
        await session.commit()
    
    msg = f"Dry-run: {match_count} matches found. No changes committed." if dry_run else f"Successfully reconciled {match_count} hostel allocations to student identities."
    return {"message": msg, "matches": match_count, "dry_run": dry_run}
