from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from database import get_db
from app.core.security import get_current_user
from app.core.security import require_role
from app import models
import app.schemas as server_schemas
from app.schemas import *

router = APIRouter()

@router.get("/dashboard/student")
async def student_dashboard(user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    # All submitted attempts
    attempts_r = await session.execute(
        select(models.QuizAttempt)
        .where(models.QuizAttempt.student_id == user["id"], models.QuizAttempt.status == "submitted")
        .order_by(models.QuizAttempt.end_time.desc())
    )
    all_attempts = attempts_r.scalars().all()

    # Active quizzes (Quiz model uses 'type' for subject, 'duration_minutes'; no status/total_marks columns)
    quizzes_r = await session.execute(
        select(models.Quiz).where(models.Quiz.college_id == user["college_id"]).order_by(models.Quiz.created_at.desc())
    )
    active_quizzes_raw = quizzes_r.scalars().all()
    attempted_ids = {a.quiz_id for a in all_attempts}
    active_quizzes = [{
        "id": q.id, "title": q.title, "subject": q.type,
        "duration_mins": q.duration_minutes, "total_marks": 0,
        "already_attempted": q.id in attempted_ids
    } for q in active_quizzes_raw[:10]]

    # In-progress attempts
    prog_r = await session.execute(
        select(models.QuizAttempt)
        .where(models.QuizAttempt.student_id == user["id"], models.QuizAttempt.status == "in_progress")
    )
    in_progress = [{"id": a.id, "quiz_id": a.quiz_id, "status": a.status} for a in prog_r.scalars().all()]

    # Semester data
    sem_r = await session.execute(
        select(models.SemesterGrade)
        .where(models.SemesterGrade.student_id == user["id"])
        .order_by(models.SemesterGrade.semester.desc())
    )
    sem_rows = sem_r.scalars().all()
    latest_sem = sem_rows[0].semester if sem_rows else 0

    total_attempts = len(all_attempts)
    avg = round(sum(a.final_score or 0 for a in all_attempts) / total_attempts, 1) if total_attempts > 0 else 0

    score_trend = [{
        "quiz": f"Quiz {i+1}",
        "score": round(a.final_score or 0, 1),
        "date": a.end_time.strftime("%b %d") if a.end_time else ""
    } for i, a in enumerate(reversed(all_attempts[:15]))]

    # Leaderboard rank via precomputed table
    rank_r = await session.execute(
        select(models.StudentRanking).where(
            models.StudentRanking.student_id == user["id"],
            models.StudentRanking.college_id == user["college_id"]
        )
    )
    ranking = rank_r.scalars().first()
    rank = ranking.rank if ranking else None
    total_students = ranking.total_students if ranking else 0

    recent_results = [{
        "id": a.id, "quiz_id": a.quiz_id,
        "final_score": a.final_score,
        "submitted_at": a.end_time.isoformat() if a.end_time else ""
    } for a in all_attempts[:5]]

    activity = [{
        "type": "quiz_result",
        "title": f"Scored {a.final_score or 0:.0f}% on quiz",
        "score": a.final_score or 0,
        "timestamp": a.end_time.isoformat() if a.end_time else ""
    } for a in all_attempts[:10]]

    return {
        "recent_results": recent_results,
        "upcoming_quizzes": active_quizzes,
        "in_progress": in_progress,
        "cgpa": 0, "current_sgpa": 0, "current_semester": latest_sem,
        "total_quizzes": total_attempts, "avg_score": avg,
        "score_trend": score_trend, "rank": rank,
        "total_students": total_students, "weak_topics": [], "activity": activity,
    }


@router.get("/dashboard/teacher")
async def teacher_dashboard(user: dict = Depends(require_role("teacher", "admin")), session: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    quizzes_r = await session.execute(
        select(models.Quiz)
        .where(models.Quiz.faculty_id == user["id"])
        .order_by(models.Quiz.created_at.desc())
    )
    my_quizzes = quizzes_r.scalars().all()
    quiz_list = []
    
    if my_quizzes:
        quiz_ids = [q.id for q in my_quizzes]
        stats_r = await session.execute(
            select(
                models.QuizAttempt.quiz_id,
                func.count(models.QuizAttempt.id).label("attempt_count"),
                func.avg(models.QuizAttempt.final_score).label("avg_score")
            )
            .where(models.QuizAttempt.quiz_id.in_(quiz_ids), models.QuizAttempt.status == "submitted")
            .group_by(models.QuizAttempt.quiz_id)
        )
        stats_map = {row.quiz_id: row for row in stats_r.all()}
        for q in my_quizzes:
            s = stats_map.get(q.id)
            quiz_list.append({
                "id": q.id, "title": q.title, "subject": q.type, "status": "active",
                "attempt_count": s.attempt_count if s else 0,
                "avg_score": round(s.avg_score, 1) if s and s.avg_score else 0
            })
    
    students_r = await session.execute(
        select(func.count(models.User.id))
        .where(models.User.role == "student", models.User.college_id == user["college_id"])
    )
    total_students = students_r.scalar() or 0
    
    recent_r = await session.execute(
        select(models.QuizAttempt).join(models.Quiz, models.Quiz.id == models.QuizAttempt.quiz_id)
        .where(models.QuizAttempt.status == "submitted", models.Quiz.college_id == user["college_id"])
        .order_by(models.QuizAttempt.end_time.desc())
        .limit(10)
    )
    recent = recent_r.scalars().all()
    return {
        "quizzes": quiz_list, "total_students": total_students,
        "recent_submissions": [{"id": r.id, "quiz_id": r.quiz_id, "student_id": r.student_id,
                                "final_score": r.final_score, "submitted_at": r.end_time.isoformat() if r.end_time else ""} for r in recent]
    }


@router.get("/dashboard/admin")
async def admin_dashboard(user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    counts_r = await session.execute(
        select(models.User.role, func.count(models.User.id)).where(models.User.college_id == user["college_id"]).group_by(models.User.role)
    )
    role_counts = {role: cnt for role, cnt in counts_r.all()}
    quizzes_r = await session.execute(select(func.count(models.Quiz.id)).where(models.Quiz.college_id == user["college_id"]))
    total_quizzes = quizzes_r.scalar() or 0
    active_r = await session.execute(select(func.count(models.Quiz.id)).where(models.Quiz.college_id == user["college_id"], models.Quiz.status == "active"))
    active_quizzes = active_r.scalar() or 0

    dept_r = await session.execute(
        select(models.UserProfile.department, func.count(models.UserProfile.user_id))
        .join(models.User, models.User.id == models.UserProfile.user_id)
        .where(models.User.college_id == user["college_id"], models.User.role == "student")
        .group_by(models.UserProfile.department)
    )
    departments = [{"name": d or "Unassigned", "count": c} for d, c in dept_r.all() if d]
    
    trend_r = await session.execute(
        select(
            func.to_char(models.User.created_at, 'Mon'),
            func.count(models.User.id)
        )
        .where(models.User.college_id == user["college_id"], models.User.role == "student")
        .group_by(func.to_char(models.User.created_at, 'Mon'))
    )
    enrollment_trend = [{"month": m, "students": c} for m, c in trend_r.all()]

    return {
        "total_students": role_counts.get("student", 0),
        "total_teachers": role_counts.get("teacher", 0),
        "total_hods": role_counts.get("hod", 0),
        "total_exam_cell": role_counts.get("exam_cell", 0),
        "total_quizzes": total_quizzes, "active_quizzes": active_quizzes,
        "departments": departments,
        "enrollment_trend": enrollment_trend
    }



@router.get("/dashboard/hod")
async def hod_dashboard(user: dict = Depends(require_role("hod", "admin")), session: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    department = user.get("scope", {}).get("department") or user.get("department")

    teachers_stmt = select(func.count(models.User.id)).outerjoin(models.UserProfile).where(
        models.User.college_id == user["college_id"], models.User.role == "teacher"
    )
    if department:
        teachers_stmt = teachers_stmt.where(models.UserProfile.department == department)
    teachers_r = await session.execute(teachers_stmt)

    students_stmt = select(func.count(models.User.id)).outerjoin(models.UserProfile).where(
        models.User.college_id == user["college_id"], models.User.role == "student"
    )
    if department:
        students_stmt = students_stmt.where(models.UserProfile.department == department)
    students_r = await session.execute(students_stmt)
    assignments_stmt = select(func.count(models.FacultyAssignment.id)).where(
        models.FacultyAssignment.college_id == user["college_id"]
    )
    if department:
        assignments_stmt = assignments_stmt.where(models.FacultyAssignment.department == department)
    assignments_r = await session.execute(assignments_stmt)
    
    pending_r = await session.execute(
        select(func.count(models.MarkSubmission.id)).where(
            models.MarkSubmission.college_id == user["college_id"],
            models.MarkSubmission.status == "submitted"
        )
    )
    approved_r = await session.execute(
        select(func.count(models.MarkSubmission.id)).where(
            models.MarkSubmission.college_id == user["college_id"],
            models.MarkSubmission.status == "approved"
        )
    )
    
    recent_r = await session.execute(
        select(models.MarkSubmission)
        .where(models.MarkSubmission.college_id == user["college_id"])
        .order_by(models.MarkSubmission.submitted_at.desc().nulls_last())
        .limit(15)
    )
    all_subs = recent_r.scalars().all()
    
    recent = [{
        "id": e.id, "course_id": e.subject_code, "exam_type": e.exam_type,
        "status": e.status or "draft", "activity_type": "marks_review"
    } for e in all_subs]
    
    return {
        "total_teachers": teachers_r.scalar() or 0,
        "total_students": students_r.scalar() or 0,
        "total_assignments": assignments_r.scalar() or 0,
        "pending_reviews": pending_r.scalar() or 0, 
        "approved_count": approved_r.scalar() or 0,
        "recent_submissions": recent
    }


@router.get("/dashboard/exam_cell")
async def exam_cell_dashboard(user: dict = Depends(require_role("exam_cell", "admin")), session: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    approved_r = await session.execute(
        select(func.count(models.MarkSubmission.id)).where(
            models.MarkSubmission.college_id == user["college_id"],
            models.MarkSubmission.status == "approved"
        )
    )
    approved = approved_r.scalar() or 0
    
    grade_count_r = await session.execute(
        select(func.count(models.SemesterGrade.id)).where(
            models.SemesterGrade.college_id == user["college_id"]
        )
    )
    total_grades = grade_count_r.scalar() or 0
    
    return {
        "total_approved_midterms": approved,
        "total_endterm": total_grades,
        "total_published": total_grades,
        "total_draft": 0,
        "recent_entries": []
    }
