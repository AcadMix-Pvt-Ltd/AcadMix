"""
Principal Service — handles logic and aggregation for the Principal domain.
Encapsulates dashboard stats, cross-departmental reports, profile management, and institution settings.
"""

from datetime import datetime, timezone, date as date_type
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, text, and_, or_

from app import models
from app.models.core import UserProfile
from app.core.exceptions import ResourceNotFoundError, BusinessLogicError
from app.core.audit import log_audit
from app.services.marks_service import MarksService

class PrincipalService:
    """Service handling multi-departmental aggregations and administrative oversight."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Institutional Profile ───────────────────────────────────────────────

    async def get_institution_profile(self, college_id: str) -> Dict[str, Any]:
        result = await self.db.execute(
            select(models.InstitutionProfile).where(
                models.InstitutionProfile.college_id == college_id
            )
        )
        profile = result.scalars().first()
        if not profile:
            return {}

        return {
            "id": profile.id,
            "recognitions": profile.recognitions,
            "infrastructure": profile.infrastructure,
            "library": profile.library,
            "mous": profile.mous,
            "extension_activities": profile.extension_activities,
            "research_publications": profile.research_publications,
            "updated_at": profile.updated_at.isoformat() if profile.updated_at else None
        }

    async def update_institution_profile(
        self, college_id: str, admin_id: str, update_data: Dict[str, Any]
    ) -> None:
        result = await self.db.execute(
            select(models.InstitutionProfile).where(
                models.InstitutionProfile.college_id == college_id
            )
        )
        profile = result.scalars().first()

        if not profile:
            profile = models.InstitutionProfile(
                college_id=college_id,
                updated_by=admin_id
            )
            self.db.add(profile)
        else:
            profile.updated_by = admin_id

        # Update fields that were provided
        for field in [
            "recognitions", "infrastructure", "library", "mous",
            "extension_activities", "research_publications"
        ]:
            if field in update_data and update_data[field] is not None:
                setattr(profile, field, update_data[field])

        await log_audit(self.db, admin_id, "institution_profile", "update", {})
        await self.db.commit()

    # ── Dashboards & Quick Stats ─────────────────────────────────────────────

    async def get_dashboard_summary(self, college_id: str) -> Dict[str, int]:
        from app.services.institution_stats import InstitutionStatsService
        stats_svc = InstitutionStatsService(self.db)
        
        students_count = await stats_svc.get_active_student_count(college_id)
        faculty_count = await stats_svc.get_active_faculty_count(college_id)
        depts_count = await stats_svc.get_department_count(college_id)
        
        pending_hod_leaves = await self.db.scalar(
            select(func.count(models.LeaveRequest.id)).where(
                models.LeaveRequest.college_id == college_id,
                models.LeaveRequest.applicant_role == "hod",
                models.LeaveRequest.status == "pending"
            )
        )

        pending_activities = await self.db.scalar(
            select(func.count(models.ActivityPermission.id)).where(
                models.ActivityPermission.college_id == college_id,
                models.ActivityPermission.hod_permission_decision == "approved",
                models.ActivityPermission.principal_noted_at.is_(None)
            )
        )

        return {
            "total_students": students_count or 0,
            "total_faculty": faculty_count or 0,
            "total_departments": depts_count or 0,
            "pending_hod_leaves": pending_hod_leaves or 0,
            "pending_activities": pending_activities or 0
        }

    # ── Reports ─────────────────────────────────────────────────────────────

    async def get_academic_performance(self, college_id: str, semester: int) -> List[Dict[str, Any]]:
        from sqlalchemy import Integer
        stmt = select(
            models.SemesterGrade.course_id,
            UserProfile.department.label('department_id'),
            func.count(models.SemesterGrade.id).label("total_students"),
            func.sum(
                func.cast(
                    and_(
                        models.SemesterGrade.grade != 'F',
                        models.SemesterGrade.grade != 'AB'
                    ), Integer
                )
            ).label("passed_students")
        ).join(
            models.User, models.User.id == models.SemesterGrade.student_id
        ).where(
            models.User.college_id == college_id,
            models.SemesterGrade.semester == semester
        ).group_by(
            models.SemesterGrade.course_id,
            UserProfile.department
        )
        
        result = await self.db.execute(stmt)
        data = []
        for row in result.all():
            total = row.total_students or 0
            passed = row.passed_students or 0
            data.append({
                "course_id": row.course_id,
                "department_id": row.department_id,
                "total_students": total,
                "passed_students": passed,
                "failed_students": total - passed,
                "pass_percentage": round((passed / total * 100) if total > 0 else 0, 2)
            })
        return data

    async def get_attendance_compliance(self, college_id: str, academic_year: str) -> List[Dict[str, Any]]:
        # Defaulters (<75%) grouped by department — uses attendance_records, not dead profile_data column
        defaulters_stmt = text('''
            SELECT 
                up.department AS department,
                COUNT(DISTINCT u.id) AS total_students,
                SUM(CASE WHEN 
                    COALESCE(att.present_count, 0)::float / NULLIF(COALESCE(att.total_count, 0)::float, 0) < 0.75 
                THEN 1 ELSE 0 END) AS defaulters_count
            FROM users u
            JOIN user_profiles up ON up.user_id = u.id
            LEFT JOIN LATERAL (
                SELECT 
                    COUNT(*) FILTER (WHERE ar.status IN ('present', 'od')) AS present_count,
                    COUNT(*) AS total_count
                FROM attendance_records ar
                WHERE ar.student_id = u.id AND ar.is_deleted = false
            ) att ON true
            WHERE u.college_id = :college_id AND u.role = 'student'
            GROUP BY up.department
        ''')

        defaulters_r = await self.db.execute(defaulters_stmt, {"college_id": college_id})
        dept_defaulters = {}
        for row in defaulters_r:
            dept = row.department or "Unknown"
            dept_defaulters[dept] = {
                "total_students": row.total_students,
                "defaulters_count": row.defaulters_count or 0,
                "compliance_rate": round(100 - ((row.defaulters_count or 0) / (row.total_students or 1) * 100), 2),
            }

        # Unmarked slots — use department name via JOIN for consistent keys
        unmarked_stmt = text('''
            SELECT 
                d.name as department,
                COUNT(ps.id) as unmarked_slots
            FROM period_slots ps
            JOIN departments d ON d.id = ps.department_id
            LEFT JOIN attendance_records ar ON ar.period_slot_id = ps.id AND ar.is_deleted = false
            WHERE ps.college_id = :college_id AND ps.academic_year = :academic_year AND ar.id IS NULL AND ps.is_deleted = false
            GROUP BY d.name
        ''')
        unmarked_r = await self.db.execute(unmarked_stmt, {"college_id": college_id, "academic_year": academic_year})
        unmarked_slots = {row.department: row.unmarked_slots for row in unmarked_r}

        all_depts = set(list(dept_defaulters.keys()) + list(unmarked_slots.keys()))
        final_data = []
        for dept in all_depts:
            final_data.append({
                "department": dept,
                "student_attendance": dept_defaulters.get(dept, {"total_students": 0, "defaulters_count": 0, "compliance_rate": 0}),
                "unmarked_faculty_slots": unmarked_slots.get(dept, 0),
            })

        return final_data

    async def get_staff_profiles_status(self, college_id: str) -> List[Dict[str, Any]]:
        """Faculty profile completeness by department. Uses user_profiles.department (not dead profile_data column)."""
        stmt = text('''
            SELECT 
                up.department as department,
                COUNT(*) as total_faculty,
                SUM(CASE WHEN 
                    up.phone IS NOT NULL
                    AND up.extra_data IS NOT NULL
                    AND jsonb_typeof(up.extra_data->'educational') = 'array'
                    AND jsonb_array_length(up.extra_data->'educational') > 0
                THEN 1 ELSE 0 END) as complete_profiles
            FROM users u
            JOIN user_profiles up ON up.user_id = u.id
            WHERE u.college_id = :college_id AND u.role IN ('teacher', 'faculty', 'hod')
            GROUP BY up.department
        ''')

        rows = await self.db.execute(stmt, {"college_id": college_id})
        return [{
            "department": r.department or "Unknown",
            "total_faculty": r.total_faculty,
            "complete_profiles": r.complete_profiles,
            "incomplete_profiles": r.total_faculty - r.complete_profiles,
            "completeness_percentage": round((r.complete_profiles / r.total_faculty * 100) if r.total_faculty > 0 else 0),
        } for r in rows]

    async def get_extension_activities(self, college_id: str) -> List[Dict[str, Any]]:
        try:
            stmt = select(
                models.ActivityPermission.activity_type,
                func.count(models.ActivityPermission.id).label("total")
            ).where(
                models.ActivityPermission.college_id == college_id,
                models.ActivityPermission.activity_type.in_(["ncc", "nss"]),
                models.ActivityPermission.hod_report_decision == "accepted"
            ).group_by(models.ActivityPermission.activity_type)
            r = await self.db.execute(stmt)
            return [{"activity_type": row.activity_type, "completed_events": row.total} for row in r.all()]
        except Exception:
            prof_r = await self.db.execute(select(models.InstitutionProfile).where(models.InstitutionProfile.college_id == college_id))
            profile = prof_r.scalars().first()
            return profile.extension_activities if profile and profile.extension_activities else []

    async def get_placement_report(self, college_id: str, academic_year: Optional[str] = None) -> Dict[str, Any]:
        """Aggregate real placement data from placement_applications + placement_drives."""
        from app.models.core import UserProfile

        # Base filters
        filters = [
            models.PlacementApplication.college_id == college_id,
            models.PlacementApplication.status == "placed",
            models.PlacementApplication.is_deleted == False,
        ]

        # Total placed + average CTC
        summary_stmt = select(
            func.count(models.PlacementApplication.id).label("total_placed"),
            func.avg(models.PlacementDrive.package_lpa).label("average_ctc"),
        ).join(
            models.PlacementDrive,
            models.PlacementDrive.id == models.PlacementApplication.drive_id,
        ).where(*filters)

        summary = (await self.db.execute(summary_stmt)).first()
        total_placed = summary.total_placed if summary else 0
        average_ctc = round(float(summary.average_ctc or 0), 2)

        # Department breakdown via user_profiles
        dept_stmt = select(
            UserProfile.department.label("department"),
            func.count(models.PlacementApplication.id).label("placed"),
            func.avg(models.PlacementDrive.package_lpa).label("avg_ctc"),
            func.max(models.PlacementDrive.package_lpa).label("max_ctc"),
        ).join(
            models.User,
            models.User.id == models.PlacementApplication.student_id,
        ).join(
            UserProfile,
            UserProfile.user_id == models.User.id,
        ).join(
            models.PlacementDrive,
            models.PlacementDrive.id == models.PlacementApplication.drive_id,
        ).where(*filters).group_by(UserProfile.department)

        dept_rows = (await self.db.execute(dept_stmt)).all()
        department_breakdown = [
            {
                "department": r.department or "Unknown",
                "placed_count": r.placed,
                "avg_ctc_lpa": round(float(r.avg_ctc or 0), 2),
                "max_ctc_lpa": round(float(r.max_ctc or 0), 2),
            }
            for r in dept_rows
        ]

        return {
            "total_placed": total_placed,
            "average_ctc": average_ctc,
            "department_breakdown": department_breakdown,
            "academic_year": academic_year,
        }

    async def get_annual_consolidation(self, user: Dict[str, Any], academic_year: str) -> Dict[str, Any]:
        college_id = user["college_id"]
        attendance = await self.get_attendance_compliance(college_id, academic_year)
        infra = (await self.get_institution_profile(college_id)).get("infrastructure", {})
        extension = await self.get_extension_activities(college_id)
        placement = await self.get_placement_report(college_id, academic_year)
        
        # CIA via MarksService
        cia_svc = MarksService(self.db)
        cia = await cia_svc.get_status_report(user, None, academic_year)

        return {
            "academic_year": academic_year,
            "generated_on": datetime.now(timezone.utc).isoformat(),
            "attendance_compliance": attendance,
            "cia_status": cia,
            "infrastructure": infra,
            "extension_activities": extension,
            "placement_overview": placement,
        }

    # ── Utility & Reassignments ──────────────────────────────────────────────

    async def add_calendar_event(self, college_id: str, new_event: Dict[str, Any]) -> None:
        cal_r = await self.db.execute(
            select(models.AcademicCalendar).where(
                models.AcademicCalendar.college_id == college_id,
                models.AcademicCalendar.end_date >= date_type.today()
            ).order_by(models.AcademicCalendar.start_date.desc()).limit(1)
        )
        calendar = cal_r.scalars().first()
        if not calendar:
            raise ResourceNotFoundError("AcademicCalendar", "Active")
        
        current_events = calendar.events or []
        current_events.append(new_event)
        calendar.events = current_events
        await self.db.commit()

    async def reassign_grievance(self, college_id: str, grievance_id: str, target_dept_id: str) -> str:
        dept_r = await self.db.execute(select(models.Department).where(
            models.Department.college_id == college_id,
            or_(models.Department.id == target_dept_id, models.Department.code == target_dept_id)
        ))
        dept = dept_r.scalars().first()
        if not dept or not dept.hod_user_id:
            raise BusinessLogicError(f"Department '{target_dept_id}' not found or has no HOD assigned")
            
        gr = await self.db.execute(select(models.Grievance).where(
            models.Grievance.id == grievance_id,
            models.Grievance.college_id == college_id
        ))
        grievance = gr.scalars().first()
        if not grievance:
            raise ResourceNotFoundError("Grievance", grievance_id)
            
        grievance.assigned_to = dept.hod_user_id
        grievance.status = "in_review"
        await self.db.commit()
        return dept.name
