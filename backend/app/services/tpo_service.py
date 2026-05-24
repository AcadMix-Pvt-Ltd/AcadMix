"""
Training & Placement Officer Service.
Handles companies, drives, Excel student uploads, and notifications.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.models.alumni_industry import Company, PlacementDrive, PlacementApplication
from app.models.core import User, UserProfile
from app.models.evaluation import SemesterGrade
from app.models.notifications import Notification
from app.models.interview_prep import PlacementRestriction
import logging

logger = logging.getLogger("acadmix.tpo")


class TPOService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Companies ───────────────────────────────────────────────────

    async def get_companies(self, college_id: str) -> List[dict]:
        result = await self.db.execute(select(Company).filter_by(college_id=college_id, is_deleted=False))
        companies = result.scalars().all()
        return [{"id": c.id, "name": c.name, "sector": c.sector, "website": c.website} for c in companies]

    async def create_company(self, college_id: str, data: dict) -> str:
        company = Company(
            college_id=college_id,
            name=data["name"],
            sector=data.get("sector"),
            website=data.get("website"),
            hr_contacts=data.get("hr_contacts"),
            bond_typical=data.get("bond_typical"),
        )
        self.db.add(company)
        await self.db.flush()
        company_id = company.id
        await self.db.commit()
        return company_id

    # ── Drives ──────────────────────────────────────────────────────

    async def get_drives(self, college_id: str) -> List[dict]:
        stmt = (
            select(PlacementDrive, Company)
            .join(Company, PlacementDrive.company_id == Company.id)
            .filter(PlacementDrive.college_id == college_id, PlacementDrive.is_deleted == False)
            .order_by(PlacementDrive.created_at.desc())
        )
        result = await self.db.execute(stmt)
        drives = []
        for drive, comp in result.all():
            drives.append({
                "id": drive.id,
                "company_id": comp.id,
                "company_name": comp.name,
                "role": drive.role_title or drive.job_description or "",
                "role_title": drive.role_title,
                "package_lpa": drive.package_lpa,
                "job_description": drive.job_description,
                "drive_date": drive.drive_date.isoformat() if drive.drive_date else None,
                "status": drive.status,
                "drive_type": drive.drive_type,
                "work_location": drive.work_location,
                "min_cgpa": drive.min_cgpa,
                "bond_period": drive.bond_period,
                "eligible_departments": drive.eligible_departments,
                "eligibility": drive.eligibility_criteria,
                "stipend": drive.stipend,
                "created_at": drive.created_at.isoformat() if drive.created_at else None,
            })
        return drives

    async def create_drive(self, college_id: str, data: dict) -> str:
        drive = PlacementDrive(
            college_id=college_id,
            company_id=data["company_id"],
            drive_type=data.get("drive_type", "on-campus"),
            type=data.get("type", "placement"),
            role_title=data.get("role_title"),
            job_description=data.get("job_description"),
            package_lpa=data.get("package_lpa"),
            drive_date=datetime.fromisoformat(data["drive_date"]) if data.get("drive_date") else None,
            min_cgpa=data.get("min_cgpa"),
            work_location=data.get("work_location"),
            status=data.get("status", "upcoming"),
            eligible_departments=data.get("eligible_departments"),
            eligibility_criteria=data.get("eligibility_criteria"),
            stipend=data.get("stipend"),
            bond_period=data.get("bond_period"),
        )
        self.db.add(drive)
        await self.db.flush()
        drive_id = drive.id
        await self.db.commit()
        return drive_id

    async def update_drive(self, college_id: str, drive_id: str, data: dict):
        result = await self.db.execute(
            select(PlacementDrive).where(PlacementDrive.id == drive_id, PlacementDrive.college_id == college_id)
        )
        drive = result.scalar_one_or_none()
        if not drive:
            raise ValueError("Drive not found")
        for key in ["role_title", "job_description", "package_lpa", "drive_date",
                     "min_cgpa", "work_location", "status", "drive_type",
                     "eligible_departments", "eligibility_criteria", "stipend", "bond_period"]:
            if key in data:
                val = data[key]
                if key == "drive_date" and isinstance(val, str) and val:
                    val = datetime.fromisoformat(val)
                setattr(drive, key, val)
        await self.db.commit()

    # ── Excel Upload: Register Students + Notify ───────────────────

    async def upload_eligible_students(
        self, college_id: str, drive_id: str, roll_numbers: List[str]
    ) -> dict:
        """
        Given a list of roll numbers extracted from Excel:
        1. Match each roll_number against UserProfile
        2. Create PlacementApplication entries
        3. Create in-app Notification for each student
        Returns { matched, unmatched, already_registered }
        """
        # Verify drive exists
        drive_result = await self.db.execute(
            select(PlacementDrive).where(PlacementDrive.id == drive_id, PlacementDrive.college_id == college_id)
        )
        drive = drive_result.scalar_one_or_none()
        if not drive:
            raise ValueError("Drive not found")

        # Get company name for notification
        company_result = await self.db.execute(select(Company).where(Company.id == drive.company_id))
        company = company_result.scalar_one_or_none()
        company_name = company.name if company else "Unknown"

        # Normalize roll numbers
        clean_rolls = [r.strip().upper() for r in roll_numbers if r and str(r).strip()]

        # Look up students by roll_number within the same college
        stmt = (
            select(UserProfile.user_id, UserProfile.roll_number)
            .where(
                func.upper(UserProfile.roll_number).in_(clean_rolls),
                UserProfile.college_id == college_id,
                UserProfile.is_deleted == False,
            )
        )
        result = await self.db.execute(stmt)
        found = {row.roll_number.upper(): row.user_id for row in result.all()}

        matched = []
        unmatched = []
        already_registered = []

        # Check existing applications
        existing_stmt = select(PlacementApplication.student_id).where(
            PlacementApplication.drive_id == drive_id,
            PlacementApplication.college_id == college_id,
            PlacementApplication.is_deleted == False,
        )
        existing_res = await self.db.execute(existing_stmt)
        existing_ids = {r for r, in existing_res.all()}

        notifications = []
        for roll in clean_rolls:
            if roll not in found:
                unmatched.append(roll)
                continue

            student_id = found[roll]
            if student_id in existing_ids:
                already_registered.append(roll)
                continue

            # Create placement application
            app = PlacementApplication(
                college_id=college_id,
                student_id=student_id,
                drive_id=drive_id,
                status="registered",
            )
            self.db.add(app)
            matched.append(roll)

            # Create in-app notification
            role_label = drive.role_title or "Position"
            pkg_label = f" — ₹{drive.package_lpa} LPA" if drive.package_lpa else ""
            notif = Notification(
                user_id=student_id,
                college_id=college_id,
                title=f"New Placement Drive: {company_name}",
                message=f"You are eligible for {company_name} ({role_label}{pkg_label}). Check the Placements section for details.",
                type="placement",
                related_entity_id=drive_id,
                related_entity_type="placement_drive",
            )
            self.db.add(notif)
            notifications.append((student_id, notif))

        await self.db.commit()

        # Push WebSocket notifications
        from app.routers.websocket import push_notification
        for student_id, notif in notifications:
            try:
                await push_notification(student_id, {
                    "title": notif.title,
                    "message": notif.message,
                    "type": "placement",
                    "entity_id": drive_id,
                })
            except Exception:
                pass  # Don't fail the upload if WS push fails

        return {
            "matched": len(matched),
            "unmatched_rolls": unmatched,
            "already_registered": len(already_registered),
            "total_processed": len(clean_rolls),
        }

    # ── CGPA Calculation ───────────────────────────────────────────

    async def _calculate_student_cgpa(self, student_id: str) -> float:
        # DATA ISOLATION: Fetch immutable academic truth from Evaluation Domain
        grades_stmt = select(SemesterGrade.grade).filter_by(student_id=student_id)
        grades = (await self.db.execute(grades_stmt)).scalars().all()

        if not grades:
            return 0.0

        grade_map = {"O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "U": 0, "F": 0}
        total_points = sum(grade_map.get(g, 0) for g in grades)
        return round(total_points / len(grades), 2)

    # ── ATS Scoring ────────────────────────────────────────────────

    async def calculate_ats_score(self, student_id: str, drive_id: str, resume_id: str) -> dict:
        from app.models.interview_prep import StudentResume
        from app.services.ai_service import score_resume_for_job
        from app.core.storage import download_file
        
        # Verify drive exists
        drive = await self.db.get(PlacementDrive, drive_id)
        if not drive:
            raise ValueError("Drive not found")
            
        # Verify resume belongs to student
        resume = await self.db.get(StudentResume, resume_id)
        if not resume or resume.student_id != student_id or resume.is_deleted:
            raise ValueError("Resume not found or access denied")
            
        if not resume.storage_key:
            return {
                "match_percentage": 0,
                "missing_keywords": ["Resume File Not Found"],
                "strong_matches": [],
                "brief_summary": "Your resume file could not be located. Please re-upload your PDF."
            }
            
        job_title = drive.role_title or "Software Engineer"
        job_description = f"{drive.job_description or ''} {drive.eligibility_criteria or ''}"
        
        pdf_bytes = download_file(resume.storage_key)
        if not pdf_bytes:
            return {
                "match_percentage": 0,
                "missing_keywords": ["File Download Failed"],
                "strong_matches": [],
                "brief_summary": "Could not fetch the resume document from storage."
            }
        
        # Delegate to AI with native media
        return await score_resume_for_job(media_bytes=pdf_bytes, mime_type=resume.content_type, job_title=job_title, job_description=job_description)

    # ── Student Application ────────────────────────────────────────

    async def apply_to_drive(self, college_id: str, student_id: str, drive_id: str, app_data: dict = None) -> dict:
        drive = await self.db.get(PlacementDrive, drive_id)
        if not drive or drive.college_id != college_id:
            return {"success": False, "error": "Drive not found"}

        # ENFORCE TPO RESTRICTIONS (Blacklist Check)
        now = datetime.utcnow()
        restriction_stmt = select(PlacementRestriction).where(
            PlacementRestriction.college_id == college_id,
            PlacementRestriction.student_id == student_id,
            PlacementRestriction.is_active == True,
            PlacementRestriction.is_deleted == False,
            or_(
                PlacementRestriction.expires_at == None,
                PlacementRestriction.expires_at > now
            ),
            or_(
                PlacementRestriction.drive_id == None,
                PlacementRestriction.drive_id == drive_id
            )
        )
        restriction_res = await self.db.execute(restriction_stmt)
        restriction = restriction_res.scalars().first()
        
        if restriction:
            if restriction.restriction_type == "blocked":
                return {"success": False, "error": f"You are currently restricted from applying: {restriction.reason}"}

        # ENFORCE RBAC & DOMAIN ISOLATION
        min_cgpa = drive.min_cgpa or (drive.eligibility_criteria or {}).get("min_cgpa", 0.0)
        actual_cgpa = await self._calculate_student_cgpa(student_id)

        if actual_cgpa < min_cgpa:
            return {"success": False, "error": f"Requires {min_cgpa} CGPA, but verified academic record shows {actual_cgpa} CGPA"}

        # Check if already applied
        existing = await self.db.execute(
            select(PlacementApplication).filter_by(student_id=student_id, drive_id=drive_id, is_deleted=False)
        )
        if existing.scalar_one_or_none():
            return {"success": False, "error": "Already applied"}

        # Extract data
        app_data = app_data or {}
        resume_id = app_data.get("resume_id")
        preferred_location = app_data.get("preferred_location")
        role = app_data.get("role")

        application = PlacementApplication(
            college_id=college_id, 
            student_id=student_id, 
            drive_id=drive_id,
            application_data=app_data,
        )
        self.db.add(application)
        await self.db.commit()
        return {"success": True, "message": "Application submitted successfully"}

    # ── Statistics ─────────────────────────────────────────────────

    async def get_stats(self, college_id: str) -> dict:
        # Count companies
        companies_count = (await self.db.execute(
            select(func.count(Company.id)).where(Company.college_id == college_id, Company.is_deleted == False)
        )).scalar() or 0

        # Count active drives
        drives_count = (await self.db.execute(
            select(func.count(PlacementDrive.id)).where(
                PlacementDrive.college_id == college_id, PlacementDrive.is_deleted == False
            )
        )).scalar() or 0

        # Students placed (selected applications)
        selected = (await self.db.execute(
            select(func.count(PlacementApplication.id)).where(
                PlacementApplication.college_id == college_id,
                PlacementApplication.status == "selected",
                PlacementApplication.is_deleted == False,
            )
        )).scalar() or 0

        # Total students registered  
        total_students = (await self.db.execute(
            select(func.count(func.distinct(PlacementApplication.student_id))).where(
                PlacementApplication.college_id == college_id,
                PlacementApplication.is_deleted == False,
            )
        )).scalar() or 0

        # Highest package from offer details
        all_selected = (await self.db.execute(
            select(PlacementApplication.offer_details).where(
                PlacementApplication.college_id == college_id,
                PlacementApplication.status == "selected",
                PlacementApplication.is_deleted == False,
            )
        )).scalars().all()

        highest = 0.0
        total_ctc = 0.0
        for od in all_selected:
            if od:
                ctc = float(od.get("ctc", 0) or 0)
                total_ctc += ctc
                if ctc > highest:
                    highest = ctc

        avg_pkg = round(total_ctc / len(all_selected), 2) if all_selected else 0.0

        # Top company
        top_company = None
        if drives_count > 0:
            top_stmt = (
                select(Company.name, func.count(PlacementApplication.id).label("cnt"))
                .join(PlacementDrive, PlacementDrive.company_id == Company.id)
                .join(PlacementApplication, PlacementApplication.drive_id == PlacementDrive.id)
                .where(
                    PlacementApplication.college_id == college_id,
                    PlacementApplication.status == "selected",
                    PlacementApplication.is_deleted == False,
                )
                .group_by(Company.name)
                .order_by(func.count(PlacementApplication.id).desc())
                .limit(1)
            )
            top_res = (await self.db.execute(top_stmt)).first()
            if top_res:
                top_company = top_res[0]

        return {
            "total_students": total_students,
            "companies_visited": companies_count,
            "total_drives": drives_count,
            "students_placed": selected,
            "highest_package": highest,
            "avg_package": avg_pkg,
            "top_company": top_company or "—",
        }

    # ── Applicants ─────────────────────────────────────────────────

    async def get_applicants(self, college_id: str, drive_id: str) -> list:
        from app.models.evaluation import QuizAttempt

        stmt = (
            select(
                PlacementApplication.id,
                PlacementApplication.status,
                PlacementApplication.registered_at,
                User.id.label("student_id"),
                User.name.label("student_name"),
                User.email,
                func.sum(QuizAttempt.telemetry_strikes).label("total_strikes")
            )
            .join(User, User.id == PlacementApplication.student_id)
            .outerjoin(QuizAttempt, User.id == QuizAttempt.student_id)
            .where(
                PlacementApplication.drive_id == drive_id,
                PlacementApplication.college_id == college_id,
                PlacementApplication.is_deleted == False,
            )
            .group_by(PlacementApplication.id, User.id)
        )
        result = await self.db.execute(stmt)
        data = []
        for row in result.all():
            data.append({
                "id": row.id,
                "student_id": row.student_id,
                "student_name": row.student_name,
                "email": row.email,
                "status": row.status,
                "applied_at": row.registered_at.isoformat() if row.registered_at else None,
                "telemetry_strikes": row.total_strikes or 0
            })
        return data

    # ── Shortlist / Results / Select ───────────────────────────────

    async def shortlist_bulk(self, college_id: str, drive_id: str, student_ids: list):
        stmt = select(PlacementApplication).where(
            PlacementApplication.drive_id == drive_id,
            PlacementApplication.college_id == college_id,
            PlacementApplication.student_id.in_(student_ids),
            PlacementApplication.is_deleted == False,
        )
        res = await self.db.execute(stmt)
        apps = res.scalars().all()
        for app in apps:
            if app.status == "registered":
                app.status = "shortlisted"
        await self.db.commit()
        return len(apps)

    async def log_result(self, college_id: str, drive_id: str, data: dict):
        from datetime import datetime
        from sqlalchemy.orm.attributes import flag_modified

        stmt = select(PlacementApplication).where(
            PlacementApplication.drive_id == drive_id,
            PlacementApplication.student_id == data["student_id"],
            PlacementApplication.college_id == college_id,
            PlacementApplication.is_deleted == False,
        )
        res = await self.db.execute(stmt)
        app = res.scalars().first()
        if not app:
            raise ValueError("Application not found")

        res_list = app.round_results or []
        res_list.append({
            "round": data.get("round_name", "Round"),
            "result": data.get("result", "pass"),
            "remarks": data.get("remarks", ""),
            "evaluated_at": datetime.utcnow().isoformat(),
        })
        app.round_results = res_list
        if data.get("result") == "fail":
            app.status = "rejected"
        flag_modified(app, "round_results")
        await self.db.commit()

    async def select_candidate(self, college_id: str, drive_id: str, data: dict):
        stmt = select(PlacementApplication).where(
            PlacementApplication.drive_id == drive_id,
            PlacementApplication.student_id == data["student_id"],
            PlacementApplication.college_id == college_id,
            PlacementApplication.is_deleted == False,
        )
        res = await self.db.execute(stmt)
        app = res.scalars().first()
        if not app:
            raise ValueError("Application not found")

        app.status = "selected"
        app.offer_details = {
            "ctc": data.get("ctc"),
            "role": data.get("role"),
            "joining_date": data.get("joining_date"),
            "location": data.get("location"),
            "offer_url": data.get("offer_url"),
            "is_accepted": False,
        }
        
        # ── BRIDGE TO ACCREDITATION ENGINE ──
        # Automatically create the SSoT PlacementRecord required for NIRF/NAAC
        from app.models.accreditation import PlacementRecord
        
        # Determine the company name from the drive
        drive_res = await self.db.execute(select(PlacementDrive).where(PlacementDrive.id == drive_id))
        drive = drive_res.scalar_one_or_none()
        company_name = "Unknown Company"
        if drive:
            comp_res = await self.db.execute(select(Company).where(Company.id == drive.company_id))
            company = comp_res.scalar_one_or_none()
            if company:
                company_name = company.name
                
        # Calculate current academic year based on today's date
        # (Assuming academic year is like "2023-2024")
        now = datetime.utcnow()
        year = now.year
        academic_year = f"{year}-{year+1}" if now.month >= 6 else f"{year-1}-{year}"
        
        # Check if record already exists to avoid duplicates
        existing_pr_stmt = select(PlacementRecord).where(
            PlacementRecord.college_id == college_id,
            PlacementRecord.student_id == data["student_id"],
            PlacementRecord.company_name == company_name,
            PlacementRecord.academic_year == academic_year
        )
        existing_pr = (await self.db.execute(existing_pr_stmt)).scalar_one_or_none()
        
        if not existing_pr:
            pr = PlacementRecord(
                college_id=college_id,
                student_id=data["student_id"],
                academic_year=academic_year,
                company_name=company_name,
                package=data.get("ctc") or drive.package_lpa,
                offer_letter_url=data.get("offer_url"),
                placed_on=now.date()
            )
            self.db.add(pr)

        await self.db.commit()

    # ── Restrictions (Blacklist) ───────────────────────────────────

    async def get_restrictions(self, college_id: str) -> List[dict]:
        stmt = (
            select(PlacementRestriction, User)
            .outerjoin(User, User.id == PlacementRestriction.student_id)
            .where(
                PlacementRestriction.college_id == college_id,
                PlacementRestriction.is_deleted == False
            )
            .order_by(PlacementRestriction.created_at.desc())
        )
        res = await self.db.execute(stmt)
        data = []
        for r, u in res.all():
            data.append({
                "id": r.id,
                "student_id": r.student_id,
                "student_name": u.name if u else "Unknown",
                "student_email": u.email if u else "Unknown",
                "drive_id": r.drive_id,
                "reason": r.reason,
                "restriction_type": r.restriction_type,
                "is_active": r.is_active,
                "expires_at": r.expires_at.isoformat() if r.expires_at else None,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            })
        return data

    async def get_student_restrictions(self, college_id: str, student_id: str) -> List[dict]:
        stmt = select(PlacementRestriction).where(
            PlacementRestriction.college_id == college_id,
            PlacementRestriction.student_id == student_id,
            PlacementRestriction.is_deleted == False,
            PlacementRestriction.is_active == True
        )
        res = await self.db.execute(stmt)
        data = []
        for r in res.scalars().all():
            data.append({
                "id": r.id,
                "drive_id": r.drive_id,
                "reason": r.reason,
                "restriction_type": r.restriction_type,
                "expires_at": r.expires_at.isoformat() if r.expires_at else None,
            })
        return data

    async def add_restriction(self, college_id: str, tpo_id: str, data: dict) -> str:
        student_id = data["student_id"]
        reason = data["reason"]
        
        expires_at = None
        if data.get("expires_at"):
            expires_at = datetime.fromisoformat(data["expires_at"])
            
        restriction = PlacementRestriction(
            college_id=college_id,
            student_id=student_id,
            drive_id=data.get("drive_id"),
            reason=reason,
            restricted_by=tpo_id,
            restriction_type=data.get("restriction_type", "blocked"),
            expires_at=expires_at
        )
        self.db.add(restriction)
        await self.db.flush()
        
        # Notify student
        notif = Notification(
            user_id=student_id,
            college_id=college_id,
            title="Placement Restriction Notice",
            message=f"You have been restricted from placement activities. Reason: {reason}",
            type="system",
            related_entity_id=restriction.id,
            related_entity_type="placement_restriction"
        )
        self.db.add(notif)
        
        res_id = restriction.id
        await self.db.commit()
        
        # Try pushing notification
        try:
            from app.routers.websocket import push_notification
            await push_notification(student_id, {
                "title": notif.title,
                "message": notif.message,
                "type": "system"
            })
        except Exception:
            pass
            
        return res_id

    async def remove_restriction(self, college_id: str, restriction_id: str):
        stmt = select(PlacementRestriction).where(
            PlacementRestriction.id == restriction_id,
            PlacementRestriction.college_id == college_id
        )
        res = await self.db.execute(stmt)
        restriction = res.scalar_one_or_none()
        if not restriction:
            raise ValueError("Restriction not found")
            
        restriction.is_active = False
        
        # Notify student
        notif = Notification(
            user_id=restriction.student_id,
            college_id=college_id,
            title="Placement Restriction Lifted",
            message=f"A placement restriction has been lifted.",
            type="system",
            related_entity_id=restriction.id,
            related_entity_type="placement_restriction"
        )
        self.db.add(notif)
        
        await self.db.commit()
        
        try:
            from app.routers.websocket import push_notification
            await push_notification(restriction.student_id, {
                "title": notif.title,
                "message": notif.message,
                "type": "system"
            })
        except Exception:
            pass
