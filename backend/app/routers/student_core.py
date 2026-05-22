from fastapi import APIRouter, Depends, HTTPException, Query, Request, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import datetime, date, timedelta

from database import get_db
from app.core.security import get_current_user
from app.core.security import require_role
from app import models
import app.schemas as server_schemas
from app.schemas import *
from app.services.student_service import StudentService
from app.services import resume_profile_service
from app.services import resume_builder_service

router = APIRouter()


@router.get("/student/my-mentor")
async def get_my_mentor(user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    """Resolves the student's active mentor from MentorAssignment."""
    service = StudentService(session)
    return await service.get_mentor_data(user["id"], user["college_id"])

@router.get("/students/search")
async def search_students(
    q: str = "", 
    department: Optional[str] = None, 
    college: Optional[str] = None, 
    limit: int = Query(10000, ge=1),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_role("hod", "admin", "exam_cell", "teacher")), 
    session: AsyncSession = Depends(get_db)):
    stmt = select(models.User).outerjoin(models.UserProfile).where(
        models.User.role == "student",
        models.User.college_id == user["college_id"]
    )
    if q:
        stmt = stmt.where(
            models.User.name.ilike(f"%{q}%") |
            models.UserProfile.roll_number.ilike(f"%{q}%") |
            models.User.id.ilike(f"%{q}%")
        )
    if department:
        stmt = stmt.where(models.UserProfile.department == department)
    result = await session.execute(stmt.order_by(models.User.name).offset(offset).limit(limit))
    students = result.scalars().all()
    return [{"id": s.id, "name": s.name, "email": s.email, "role": s.role, **(s.profile_data or {})} for s in students]


@router.get("/students/{student_id}/profile")
async def student_profile(student_id: str, user: dict = Depends(require_role("hod", "admin", "exam_cell", "teacher")), session: AsyncSession = Depends(get_db)):
    student_r = await session.execute(select(models.User).where(
        models.User.id == student_id,
        models.User.college_id == user["college_id"]
    ))
    student = student_r.scalars().first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # ── Grade → grade-point mapping ──────────────────────────────────────
    _GRADE_POINTS = {
        "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6,
        "C": 5, "D": 4, "F": 0, "AB": 0,
    }

    # ── Semester grades with subject name via LEFT JOIN courses ───────────
    from sqlalchemy import and_
    semesters_r = await session.execute(
        select(
            models.SemesterGrade,
            models.Course.name.label("course_name"),
            models.Course.subject_code.label("course_subject_code"),
        )
        .outerjoin(
            models.Course,
            and_(
                models.Course.id == models.SemesterGrade.course_id,
                models.Course.college_id == user["college_id"],
            )
        )
        .where(models.SemesterGrade.student_id == student_id)
        .order_by(models.SemesterGrade.semester.asc())
    )
    from collections import defaultdict
    sem_map = defaultdict(list)
    for grade_row, course_name, course_subject_code in semesters_r.all():
        sem_map[grade_row.semester].append({
            "name": course_name or grade_row.course_id,
            "code": course_subject_code or grade_row.course_id,
            "credits": grade_row.credits_earned,
            "grade": grade_row.grade,
            "status": "PASS" if grade_row.grade not in ("F", "AB") else "FAIL",
        })

    # Compute SGPA per semester, cumulative CGPA
    all_cumulative = []
    semesters = []
    for sem, subjects in sorted(sem_map.items()):
        total_credits = sum(s["credits"] for s in subjects)
        sgpa = round(sum(_GRADE_POINTS.get(s["grade"], 0) * s["credits"] for s in subjects) / total_credits, 2) if total_credits > 0 else 0
        all_cumulative.extend(subjects)
        total_cum = sum(s["credits"] for s in all_cumulative)
        cgpa = round(sum(_GRADE_POINTS.get(s["grade"], 0) * s["credits"] for s in all_cumulative) / total_cum, 2) if total_cum > 0 else 0
        semesters.append({"semester": sem, "sgpa": sgpa, "cgpa": cgpa, "subjects": subjects})

    # ── Quiz attempts with title via JOIN Quiz ───────────────────────────
    attempts_r = await session.execute(
        select(models.QuizAttempt, models.Quiz.title, models.Quiz.total_marks)
        .join(models.Quiz, models.Quiz.id == models.QuizAttempt.quiz_id)
        .where(models.QuizAttempt.student_id == student_id, models.QuizAttempt.status == "submitted")
        .order_by(models.QuizAttempt.end_time.desc())
    )
    attempts = attempts_r.all()

    # ── Mid-term marks with subject name ─────────────────────────────────
    marks_r = await session.execute(
        select(models.MarkSubmissionEntry, models.MarkSubmission)
        .join(models.MarkSubmission, models.MarkSubmission.id == models.MarkSubmissionEntry.submission_id)
        .where(
            models.MarkSubmissionEntry.student_id == student_id,
            models.MarkSubmission.exam_type.in_(["mid1", "mid2"]),
            models.MarkSubmission.status.in_(["approved", "published"]),
        )
    )
    marks_rows = marks_r.all()

    # Resolve subject_code → subject_name via FacultyAssignment (same college)
    subject_codes = list({sub.subject_code for _, sub in marks_rows})
    subj_name_map = {}
    if subject_codes:
        fa_r = await session.execute(
            select(models.FacultyAssignment.subject_code, models.FacultyAssignment.subject_name)
            .where(
                models.FacultyAssignment.college_id == user["college_id"],
                models.FacultyAssignment.subject_code.in_(subject_codes),
            )
            .distinct(models.FacultyAssignment.subject_code)
        )
        for code, name in fa_r.all():
            subj_name_map[code] = name

    mid_marks = [{
        "subject_name": subj_name_map.get(sub.subject_code, sub.subject_code),
        "subject_code": sub.subject_code,
        "exam_type": sub.exam_type,
        "marks": entry.marks_obtained,
        "max_marks": sub.max_marks
    } for entry, sub in marks_rows]

    return {
        "student": {"id": student.id, "name": student.name, "email": student.email, **(student.profile_data or {})},
        "semesters": semesters,
        "quiz_attempts": [{"quiz_id": a.quiz_id, "quiz_title": title or "Untitled Quiz", "score": a.final_score, "total": total or 0,
                           "percentage": round((a.final_score / total * 100), 1) if total else 0,
                           "submitted_at": a.end_time.isoformat() if a.end_time else ""} for a, title, total in attempts[:10]],
        "mid_marks": mid_marks
    }


@router.get("/student/drives")
async def get_eligible_student_drives(user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    service = StudentService(session)
    return await service.get_eligible_drives(user)


@router.get("/student/placement-drives")
async def get_student_placement_drives(user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    """Returns placement drives the student is registered for — used by the calendar."""
    from sqlalchemy import func as sa_func
    stmt = (
        select(models.PlacementDrive, models.Company)
        .join(models.PlacementApplication, models.PlacementApplication.drive_id == models.PlacementDrive.id)
        .join(models.Company, models.Company.id == models.PlacementDrive.company_id)
        .where(
            models.PlacementApplication.student_id == user["id"],
            models.PlacementApplication.college_id == user["college_id"],
            models.PlacementApplication.is_deleted == False,
            models.PlacementDrive.is_deleted == False,
        )
        .order_by(models.PlacementDrive.drive_date.desc().nulls_last())
    )
    result = await session.execute(stmt)
    return [
        {
            "id": d.id,
            "company_name": c.name,
            "role_title": d.role_title,
            "package_lpa": d.package_lpa,
            "drive_date": d.drive_date.isoformat() if d.drive_date else None,
            "drive_type": d.drive_type,
            "status": d.status,
            "work_location": d.work_location,
        }
        for d, c in result.all()
    ]

@router.post("/student/drives/{drive_id}/apply")
async def apply_for_placement_drive(drive_id: str, user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    service = StudentService(session)
    application_id = await service.apply_for_drive(drive_id, user)
    return {"message": "Successfully applied to drive", "application_id": str(application_id)}


@router.delete("/student/drives/{drive_id}/withdraw")
async def withdraw_application(drive_id: str, user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    service = StudentService(session)
    await service.withdraw_from_drive(drive_id, user)
    return {"message": "Application withdrawn successfully"}


@router.get("/student/applications")
async def get_student_application_history(user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.PlacementApplication).where(
        models.PlacementApplication.student_id == user["id"],
        models.PlacementApplication.college_id == user["college_id"],
        models.PlacementApplication.is_deleted == False
    )
    res = await session.execute(stmt)
    return res.scalars().all()


@router.get("/student/alumni-jobs")
async def browse_alumni_jobs(
    limit: int = Query(10000, ge=1),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.AlumniJobPosting, models.User.name.label("alumni_name")).join(
        models.User, models.User.id == models.AlumniJobPosting.alumni_id
    ).where(
        models.AlumniJobPosting.college_id == user["college_id"],
        models.AlumniJobPosting.status == "active"
    )
    results = (await session.execute(stmt.order_by(models.AlumniJobPosting.created_at.desc()).offset(offset).limit(limit))).all()
    
    return [{"job": r[0], "posted_by": r[1]} for r in results]


@router.get("/student/alumni-mentors")
async def browse_available_mentors(
    limit: int = Query(10000, ge=1),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.User.id, models.User.name, models.User.profile_data).where(
        models.User.college_id == user["college_id"],
        models.User.role == "alumni",
        models.User.is_deleted == False
    )
    # Applying limits after Python-side filtering because mentoring preference is inside JSON
    # Alternatively limit the fetch bounds
    alumni = (await session.execute(stmt.order_by(models.User.name).offset(offset).limit(limit * 3))).all()
    # Filter JSON for mentoring opt-in
    mentors = []
    for a in alumni:
        pd = a.profile_data or {}
        prefs = pd.get("contact_preferences", {})
        # If they opted into mentoring
        if type(prefs) == dict and prefs.get("Mentoring Students", False):
             mentors.append({"id": a.id, "name": a.name, "expertise": pd.get("expertise_areas", [])})
             
    # Enforce precise limit
    return mentors[:limit]


@router.post("/student/alumni-mentorship/request")
async def request_mentorship(
    alumni_id: str = Body(..., embed=True),
    focus_area: str = Body(..., embed=True),
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db)
):
    m = models.AlumniMentorship(
        college_id=user["college_id"],
        student_id=user["id"],
        alumni_id=alumni_id,
        focus_area=focus_area
    )
    session.add(m)
    await session.commit()
    return {"message": "Mentorship requested"}


@router.get("/student/scholarships")
async def get_available_scholarships(
    limit: int = Query(10000, ge=1),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_role("student")), 
    session: AsyncSession = Depends(get_db)):
    """List scholarships available at the student's college."""
    res = await session.execute(
        select(models.Scholarship).where(
            models.Scholarship.college_id == user["college_id"],
            models.Scholarship.is_deleted == False
        ).order_by(models.Scholarship.created_at.desc()).offset(offset).limit(limit)
    )
    return res.scalars().all()


@router.post("/student/scholarships/apply")
async def apply_scholarship(req: ScholarshipApplyRequest, user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    # Check if already applied
    existing = await session.execute(
        select(models.ScholarshipApplication).where(
            models.ScholarshipApplication.student_id == user["id"],
            models.ScholarshipApplication.scholarship_id == req.scholarship_id
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Already applied for this scholarship")
    app_row = models.ScholarshipApplication(
        college_id=user["college_id"],
        student_id=user["id"],
        scholarship_id=req.scholarship_id,
        status="submitted"
    )
    session.add(app_row)
    await session.commit()
    return {"message": "Scholarship application submitted", "id": app_row.id}


@router.get("/student/scholarships/my-applications")
async def get_my_scholarship_apps(user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    res = await session.execute(
        select(models.ScholarshipApplication).where(
            models.ScholarshipApplication.student_id == user["id"]
        )
    )
    return res.scalars().all()


@router.get("/student/study-materials")
async def get_student_materials(subject_code: Optional[str] = None, user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    query = select(models.StudyMaterial).where(
        models.StudyMaterial.college_id == user["college_id"],
        models.StudyMaterial.status == 'expert_approved'
    )
    if subject_code:
        query = query.where(models.StudyMaterial.subject_code == subject_code)
        
    res = await session.execute(query.order_by(models.StudyMaterial.created_at.desc()))
    return res.scalars().all()


# ═══════════════════════════════════════════════════════════════════════════════
# Resume Profile — Student-editable fields for resume builder auto-fill
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/student/resume-profile")
async def get_resume_profile(
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db),
):
    """Fetch resume profile — auto-filled ERP data + student-editable fields."""
    return await resume_profile_service.get_resume_profile(user, session)


@router.put("/student/resume-profile")
async def update_resume_profile(
    data: dict = Body(...),
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db),
):
    """Update student-editable resume profile fields (projects, skills, experience, etc.)."""
    return await resume_profile_service.update_resume_profile(user, data, session)


@router.get("/student/verify-social-profile")
async def verify_social_profile(
    platform: str = Query(..., regex="^(github|linkedin|portfolio)$"),
    username: str = Query(..., min_length=1, max_length=500),
    user: dict = Depends(require_role("student")),
):
    """Verify a GitHub/LinkedIn/portfolio profile exists and return public metadata."""
    return await resume_profile_service.verify_social_profile(platform, username)


@router.post("/student/resume/generate-docx")
async def generate_resume_docx(
    body: dict = Body(default={}),
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db),
):
    """Generate a .docx resume from the student's resume profile data."""
    template = body.get("template", "classic")
    try:
        buffer, filename = await resume_builder_service.generate_docx(user, session, template)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/student/resume/generate")
async def generate_resume(
    body: dict = Body(default={}),
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db),
):
    """Generate a resume in the requested format. DOCX uses the full builder; PDF is a lightweight ATS preview export."""
    template = body.get("template", "classic")
    fmt = (body.get("format") or "docx").lower()
    if fmt == "docx":
        try:
            buffer, filename = await resume_builder_service.generate_docx(user, session, template)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    if fmt != "pdf":
        raise HTTPException(status_code=400, detail="Supported formats: docx, pdf")

    profile = await resume_profile_service.get_resume_profile(user, session)
    pdf_bytes = _minimal_resume_pdf(profile)
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="AcadMix_Resume.pdf"'},
    )


def _minimal_resume_pdf(profile: dict) -> bytes:
    auto = profile.get("auto_filled", {}) if profile else {}
    editable = profile.get("editable", {}) if profile else {}
    lines = [
        auto.get("name") or "AcadMix Resume",
        " | ".join([v for v in [editable.get("email") or auto.get("email"), editable.get("phone") or auto.get("phone"), editable.get("location")] if v]),
        "",
        "Summary",
        editable.get("summary") or "",
        "",
        "Education",
        " ".join([auto.get("department") or "", auto.get("institution") or "", auto.get("batch") or ""]).strip(),
        "",
        "Skills",
        ", ".join(sum((editable.get("skills", {}).get(k, []) for k in ["languages", "frameworks", "tools", "databases"]), [])),
    ]
    y = 760
    stream = ["BT", "/F1 11 Tf", "72 780 Td"]
    first = True
    for line in lines[:40]:
        safe = str(line).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")[:110]
        if first:
            stream.append(f"({safe}) Tj")
            first = False
        else:
            y -= 16
            stream.append(f"0 -16 Td ({safe}) Tj")
    stream.append("ET")
    content = "\n".join(stream).encode("latin-1", "ignore")
    objects = [
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
        b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
        b"5 0 obj << /Length " + str(len(content)).encode() + b" >> stream\n" + content + b"\nendstream endobj",
    ]
    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf.extend(obj + b"\n")
    xref = len(pdf)
    pdf.extend(f"xref\n0 {len(objects)+1}\n0000000000 65535 f \n".encode())
    for off in offsets[1:]:
        pdf.extend(f"{off:010d} 00000 n \n".encode())
    pdf.extend(f"trailer << /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode())
    return bytes(pdf)


# ═══════════════════════════════════════════════════════════════════════════════
# Gamified Progress Analytics
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/students/ping-activity")
async def ping_student_activity(
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db),
):
    """
    Update student's streak and XP.
    Should be called once per day per user when they interact with the platform.
    """
    student_r = await session.execute(
        select(models.UserProfile).where(models.UserProfile.user_id == user["id"])
    )
    profile = student_r.scalars().first()

    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    today = date.today()
    
    # If they already pinged today, just return current stats
    if profile.last_active_date == today:
        return {
            "message": "Already active today",
            "xp_points": profile.xp_points,
            "current_streak": profile.current_streak,
            "longest_streak": profile.longest_streak,
            "last_active_date": profile.last_active_date
        }

    # Streak Logic
    if profile.last_active_date == today - timedelta(days=1):
        # Consecutive day
        profile.current_streak += 1
    else:
        # Streak broken or first time
        profile.current_streak = 1

    # Update longest streak
    if profile.current_streak > profile.longest_streak:
        profile.longest_streak = profile.current_streak

    # XP reward for logging in/activity (e.g. 10 XP)
    profile.xp_points += 10
    
    # Extra XP for streak milestones (e.g., every 7 days)
    if profile.current_streak % 7 == 0:
        profile.xp_points += 50
        
    profile.last_active_date = today

    await session.commit()
    await session.refresh(profile)

    return {
        "message": "Activity tracked successfully",
        "xp_points": profile.xp_points,
        "current_streak": profile.current_streak,
        "longest_streak": profile.longest_streak,
        "last_active_date": profile.last_active_date
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Mental Health & Burnout Check-ins
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/students/mood")
async def log_student_mood(
    mood_score: int = Body(..., ge=1, le=5, description="1 to 5 (1=Terrible, 5=Great)"),
    energy_score: int = Body(..., ge=1, le=5, description="1 to 5 (1=Exhausted, 5=Energized)"),
    notes: Optional[str] = Body(None),
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db),
):
    """
    Log daily mental health and burnout levels.
    """
    today = date.today()
    # Check if already logged today
    existing = await session.execute(
        select(models.MoodCheckin).where(
            models.MoodCheckin.student_id == user["id"],
            models.MoodCheckin.created_at >= datetime.combine(today, datetime.min.time())
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Mood already logged today")

    checkin = models.MoodCheckin(
        college_id=user["college_id"],
        student_id=user["id"],
        mood_score=mood_score,
        energy_score=energy_score,
        notes=notes
    )
    session.add(checkin)
    await session.commit()
    
    return {"message": "Mood logged successfully", "id": checkin.id}

