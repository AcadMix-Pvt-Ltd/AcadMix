import logging
from typing import List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from datetime import date
from dateutil.relativedelta import relativedelta

from app.models.core import User, UserProfile, Department, Section
from app.models.accreditation import FacultyProfile, FacultyAchievement
from app.models.infrastructure import InfrastructureExpenditure, InstitutionalMoU

logger = logging.getLogger("acadmix.accreditation.base_generator")

class BaseAccreditationGenerator:
    """
    Abstract base class for all accreditation generators (NIRF, NAAC, NBA, NEP).
    Provides strictly governed SSoT (Single Source of Truth) queries that all reports must share.
    """
    def __init__(self, session: AsyncSession, college_id: str, report_year: int):
        self.session = session
        self.college_id = college_id
        self.report_year = report_year

    async def get_sanctioned_intake_vs_actual(self) -> Tuple[int, int]:
        """
        Returns (sanctioned_intake, actual_enrollment) for the entire college for the current report year.
        Shared SSoT for NIRF FSR, NAAC C2, NBA C4.
        """
        # Get Sanctioned
        stmt_sanc = select(func.sum(Section.intake)).where(
            Section.college_id == self.college_id,
            Section.is_deleted == False
        )
        sanc_res = await self.session.execute(stmt_sanc)
        sanctioned = sanc_res.scalar() or 0

        # Get Actual (Active Students)
        stmt_act = select(func.count(UserProfile.id)).join(
            User, User.id == UserProfile.user_id
        ).where(
            UserProfile.college_id == self.college_id,
            User.role == "student",
            UserProfile.enrollment_status == "active",
            User.is_deleted == False
        )
        act_res = await self.session.execute(stmt_act)
        actual = act_res.scalar() or 0
        
        return int(sanctioned), int(actual)

    async def get_faculty_counts(self) -> Dict[str, Any]:
        """
        Returns detailed faculty counts.
        Shared SSoT for NIRF TLR, NAAC C2, NBA C5.
        """
        stmt = select(
            User.id,
            FacultyProfile.qualification,
            FacultyProfile.experience_years
        ).join(
            FacultyProfile, FacultyProfile.faculty_id == User.id
        ).where(
            User.college_id == self.college_id,
            User.role == "faculty",
            User.is_deleted == False
        )
        res = await self.session.execute(stmt)
        faculty_list = res.all()

        total = len(faculty_list)
        regular = 0
        visiting = 0
        phd_count = 0
        total_experience_years = 0

        for f in faculty_list:
            emp_type = "regular"  # Defaults to regular if not specified
            if emp_type == "regular":
                regular += 1
            else:
                visiting += 1
                
            if f.qualification and "phd" in f.qualification.lower():
                phd_count += 1
                
            total_experience_years += (f.experience_years or 0)

        return {
            "total": total,
            "regular": regular,
            "visiting": visiting,
            "phd_count": phd_count,
            "phd_percentage": (phd_count / total * 100) if total > 0 else 0,
            "average_experience": (total_experience_years / total) if total > 0 else 0,
            "faculty_list": faculty_list
        }
    
    async def get_infrastructure_expenditure(self) -> Dict[str, float]:
        """
        Returns actual expenditure for the report year.
        Shared SSoT for NIRF TLR (LL) and NAAC C4.
        """
        stmt = select(
            InfrastructureExpenditure.category,
            func.sum(InfrastructureExpenditure.actual_expenditure)
        ).where(
            InfrastructureExpenditure.college_id == self.college_id,
            InfrastructureExpenditure.academic_year == self.report_year,
            InfrastructureExpenditure.is_deleted == False
        ).group_by(InfrastructureExpenditure.category)
        
        res = await self.session.execute(stmt)
        data = {row[0]: row[1] for row in res.all()}
        return {
            "library_physical": data.get("library_physical", 0.0),
            "library_digital": data.get("library_digital", 0.0),
            "lab_equipment": data.get("lab_equipment", 0.0),
            "it_infrastructure": data.get("it_infrastructure", 0.0),
        }
