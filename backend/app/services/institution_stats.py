"""
Institution Stats Service — Provides a Single Source of Truth (SSoT) for core institutional metrics.
Ensures consistency across all dashboards (Principal, HOD, Admin) and Accreditation engines (NAAC, NBA, NIRF)
by strictly enforcing is_deleted and enrollment_status rules.
"""

from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.models.core import User, UserProfile, Department
from app.models.accreditation import FacultyProfile

class InstitutionStatsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_active_student_count(self, college_id: str) -> int:
        """
        SSoT for Active Students.
        Must be role='student', is_deleted=False, enrollment_status='active'.
        """
        stmt = select(func.count(UserProfile.id)).join(
            User, User.id == UserProfile.user_id
        ).where(
            UserProfile.college_id == college_id,
            User.role == "student",
            UserProfile.enrollment_status == "active",
            User.is_deleted == False
        )
        res = await self.db.execute(stmt)
        return res.scalar() or 0

    async def get_active_faculty_count(self, college_id: str) -> int:
        """
        SSoT for Active Faculty.
        Must be a faculty role ('faculty', 'teacher', 'hod', 'principal'), is_deleted=False.
        """
        stmt = select(func.count(User.id)).where(
            User.college_id == college_id,
            User.role.in_(["faculty", "teacher", "hod", "principal"]),
            User.is_deleted == False
        )
        res = await self.db.execute(stmt)
        return res.scalar() or 0

    async def get_department_count(self, college_id: str) -> int:
        """
        SSoT for Departments.
        Must be is_deleted=False.
        """
        stmt = select(func.count(Department.id)).where(
            Department.college_id == college_id,
            Department.is_deleted == False
        )
        res = await self.db.execute(stmt)
        return res.scalar() or 0

    async def get_faculty_details(self, college_id: str, department_id: str = None) -> List[Dict[str, Any]]:
        """
        SSoT for Detailed Faculty lists.
        Joins User, UserProfile, and FacultyProfile.
        Checks is_deleted=False on User.
        """
        stmt = select(
            User,
            UserProfile,
            FacultyProfile
        ).join(
            UserProfile, User.id == UserProfile.user_id
        ).outerjoin(
            FacultyProfile, FacultyProfile.faculty_id == User.id
        ).where(
            User.college_id == college_id,
            User.role.in_(["faculty", "teacher", "hod", "principal"]),
            User.is_deleted == False
        )
        
        if department_id:
            stmt = stmt.where(UserProfile.department == department_id)

        res = await self.db.execute(stmt)
        rows = res.all()

        results = []
        for u, up, fp in rows:
            results.append({
                "id": u.id,
                "name": u.name,
                "role": u.role,
                "department": up.department,
                "qualification": fp.qualification if fp else None,
                "experience_years": fp.experience_years if fp else 0,
                "designation": fp.designation if fp else None
            })
            
        return results
