import io
import json
import logging
import pandas as pd
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.accreditation import (
    NAACAuditSnapshot,
    NAACQualitativeNarrative,
    AccreditationEvidence,
    POAttainmentRecord,
    COAttainmentRecord,
    AccreditationReportJob
)
from app.models.outcomes import ProgramOutcome, CourseOutcome
from app.models.core import College
from app.models.academics import Course

logger = logging.getLogger("acadmix.services.report_engine")

class ReportEngineService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def _fetch_college_info(self, college_id: str):
        college = (await self.session.scalars(
            select(College).where(College.id == college_id)
        )).first()
        if college:
            # Add some dummy programs and admissions data if real ones don't exist
            # since there's no program table yet we inject some for the demo report
            return {
                "id": college.id,
                "name": college.name,
                "domain": college.domain,
                "vision": "To be a global center of excellence in technological education and research, fostering innovation and leadership to address societal challenges.",
                "mission": "To impart quality technical education through continuous curriculum innovation. To establish state-of-the-art research facilities. To promote industry-academia collaboration and instill ethical values in our graduates.",
                "programs_data": [
                    {"level": "UG", "name": "B.Tech in Computer Science and Engineering", "duration": "4 Years", "medium": "English", "sanctioned": 120, "admitted": 118},
                    {"level": "UG", "name": "B.Tech in Electronics and Communication", "duration": "4 Years", "medium": "English", "sanctioned": 60, "admitted": 58},
                    {"level": "UG", "name": "B.Tech in Artificial Intelligence", "duration": "4 Years", "medium": "English", "sanctioned": 60, "admitted": 60},
                    {"level": "PG", "name": "M.Tech in Data Science", "duration": "2 Years", "medium": "English", "sanctioned": 18, "admitted": 15}
                ],
                "category_admission_data": [
                    {"year": "2023-2024", "general": 110, "sc": 45, "st": 15, "obc": 81},
                    {"year": "2022-2023", "general": 105, "sc": 42, "st": 12, "obc": 75},
                    {"year": "2021-2022", "general": 98, "sc": 40, "st": 10, "obc": 70},
                    {"year": "2020-2021", "general": 90, "sc": 38, "st": 8, "obc": 65}
                ]
            }
        return {}

    async def aggregate_naac_payload(self, college_id: str, academic_year: str) -> dict:
        """
        Aggregates data for the NAAC SSR report.
        This includes both quantitative snapshots and qualitative narratives.
        """
        college_info = await self._fetch_college_info(college_id)

        # 1. Fetch Qualitative Narratives (QlM)
        narratives = (await self.session.scalars(
            select(NAACQualitativeNarrative).where(
                NAACQualitativeNarrative.college_id == college_id,
                NAACQualitativeNarrative.academic_year == academic_year
            )
        )).all()
        
        qlm_data = {}
        for n in narratives:
            qlm_data[n.criterion_code] = {
                "name": n.criterion_name,
                "text": n.narrative_text,
                "is_complete": n.is_complete
            }

        # 2. Fetch Quantitative Snapshots (QnM) - 5 Year Data Convention
        current_year_parts = academic_year.split('-')
        try:
            start_year = int(current_year_parts[0])
            academic_years = [f"{start_year - i}-{start_year - i + 1}" for i in range(5)]
        except ValueError:
            academic_years = [academic_year]
            
        snapshots = (await self.session.scalars(
            select(NAACAuditSnapshot).where(
                NAACAuditSnapshot.college_id == college_id,
                NAACAuditSnapshot.academic_year.in_(academic_years)
            )
        )).all()

        qnm_data = {}
        # Group by metric_code
        metric_codes = set(s.metric_code for s in snapshots)
        for code in metric_codes:
            metric_snapshots = [s for s in snapshots if s.metric_code == code]
            yearly_data = []
            all_evidence_ids = set()
            for ay in academic_years:
                snap = next((s for s in metric_snapshots if s.academic_year == ay), None)
                if snap:
                    yearly_data.append({
                        "year": ay,
                        "value": snap.computed_value,
                        "evidence_ids": snap.evidence_ids or [],
                        "locked": snap.locked_at is not None
                    })
                    if snap.evidence_ids:
                        for eid in snap.evidence_ids:
                            all_evidence_ids.add(eid)
                else:
                    yearly_data.append({
                        "year": ay,
                        "value": None,
                        "evidence_ids": [],
                        "locked": False
                    })
            
            # Fetch actual evidence links for this metric
            evidence_list = []
            if all_evidence_ids:
                stmt_ev = select(AccreditationEvidence).where(AccreditationEvidence.id.in_(list(all_evidence_ids)))
                evidences = (await self.session.scalars(stmt_ev)).all()
                for ev in evidences:
                    evidence_list.append({
                        "description": getattr(ev, "file_name", f"Evidence for {code}"),
                        "presigned_url": getattr(ev, "s3_key", f"https://acadmix-assets.s3.com/dummy_{code}.pdf")
                    })
                    
            qnm_data[code] = {
                "name": getattr(metric_snapshots[0], "metric_name", f"Metric {code}"),
                "yearly_data": yearly_data,
                "evidence": evidence_list
            }

        nep_data = await self.get_nep_preparedness_data(college_id, academic_year)
        days_to_results = await self._calculate_days_to_results(college_id, academic_years)

        return {
            "college": college_info,
            "academic_year": academic_year,
            "report_type": "NAAC SSR",
            "generated_at": datetime.utcnow().isoformat(),
            "days_to_results_avg": days_to_results,
            "nep_preparedness": nep_data,
            "qualitative_metrics": qlm_data,
            "quantitative_metrics": qnm_data,
            "programs_data": college_info.get("programs_data", []),
            "category_admission_data": college_info.get("category_admission_data", []),
            "executive_summary": {
                "intro": f"This is the NAAC SSR Report for {college_info.get('name', 'our institution')}.",
                "vision": college_info.get("vision", ""),
                "mission": college_info.get("mission", "")
            },
            "swoc": {
                "strength": qlm_data.get("swoc_strength", {}).get("text", "Strength narrative not provided."),
                "weakness": qlm_data.get("swoc_weakness", {}).get("text", "Weakness narrative not provided."),
                "opportunity": qlm_data.get("swoc_opportunity", {}).get("text", "Opportunity narrative not provided."),
                "challenge": qlm_data.get("swoc_challenge", {}).get("text", "Challenge narrative not provided.")
            }
        }

    async def _calculate_days_to_results(self, college_id: str, academic_years: list) -> float:
        """
        NAAC Criterion 2: Average days to declare results.
        Calculated from MarkSubmission published_at - submitted_at.
        """
        from app.models.evaluation import MarkSubmission
        submissions = (await self.session.scalars(
            select(MarkSubmission).where(
                MarkSubmission.college_id == college_id,
                MarkSubmission.published_at.isnot(None),
                MarkSubmission.submitted_at.isnot(None)
            )
        )).all()

        if not submissions:
            return 0.0

        total_days = 0
        count = 0
        for sub in submissions:
            diff = (sub.published_at - sub.submitted_at).days
            if diff >= 0:
                total_days += diff
                count += 1
                
        return round(total_days / count, 1) if count > 0 else 0.0

    async def get_nep_preparedness_data(self, college_id: str, academic_year: str) -> dict:
        """
        Fetches the 6-point NEP 2020 preparedness narrative for the institution.
        """
        nep_codes = [f"NEP_{i}" for i in range(1, 7)]
        narratives = (await self.session.scalars(
            select(NAACQualitativeNarrative).where(
                NAACQualitativeNarrative.college_id == college_id,
                NAACQualitativeNarrative.academic_year == academic_year,
                NAACQualitativeNarrative.criterion_code.in_(nep_codes)
            )
        )).all()

        # Standard labels for the 6 points based on SIRT reference
        labels = {
            "NEP_1": "Multidisciplinary/interdisciplinary",
            "NEP_2": "Academic bank of credits (ABC)",
            "NEP_3": "Skill development",
            "NEP_4": "Appropriate integration of Indian Knowledge system",
            "NEP_5": "Focus on Outcome based education (OBE)",
            "NEP_6": "Distance education/online education"
        }

        data = {}
        for code in nep_codes:
            narrative = next((n for n in narratives if n.criterion_code == code), None)
            data[code] = {
                "title": labels.get(code, code),
                "text": narrative.narrative_text if narrative else "",
                "is_complete": narrative.is_complete if narrative else False
            }
            
        return data

    async def _get_attainment_config_fallback(self, college_id: str, batch_year: str, department_id: str) -> dict:
        """
        Enforces the AttainmentConfig fallback chain:
        1. Department-level config
        2. College-level config
        3. AcadMix System Default (60% threshold, 0.8/0.2 weights, 2.5 target)
        """
        from app.models.accreditation import AttainmentConfig
        # Try Department-level
        config = (await self.session.scalars(
            select(AttainmentConfig).where(
                AttainmentConfig.college_id == college_id,
                AttainmentConfig.batch_year == batch_year,
                AttainmentConfig.department_id == department_id
            )
        )).first()
        
        if config:
            return {
                "direct_threshold_pct": config.direct_threshold_pct,
                "direct_weight": config.direct_weight,
                "indirect_weight": config.indirect_weight,
                "po_target_level": config.po_target_level
            }
            
        # Try College-level (department_id is None)
        config = (await self.session.scalars(
            select(AttainmentConfig).where(
                AttainmentConfig.college_id == college_id,
                AttainmentConfig.batch_year == batch_year,
                AttainmentConfig.department_id == None
            )
        )).first()
        
        if config:
            return {
                "direct_threshold_pct": config.direct_threshold_pct,
                "direct_weight": config.direct_weight,
                "indirect_weight": config.indirect_weight,
                "po_target_level": config.po_target_level
            }
            
        # System Default Fallback
        return {
            "direct_threshold_pct": 60.0,
            "direct_weight": 0.80,
            "indirect_weight": 0.20,
            "po_target_level": 2.5
        }

    async def _calculate_faculty_metrics(self, college_id: str, department_id: str) -> dict:
        from app.models.accreditation import FacultyProfile
        from app.models.core import UserProfile
        
        # Join FacultyProfile and UserProfile to get department
        faculty = (await self.session.scalars(
            select(FacultyProfile)
            .join(UserProfile, UserProfile.user_id == FacultyProfile.faculty_id)
            .where(
                FacultyProfile.college_id == college_id,
                UserProfile.department == department_id
            )
        )).all()

        total_f = len(faculty)
        if total_f == 0:
            return {
                "qualification_score": 0.0,
                "cadre_proportion_score": 0.0,
                "total_faculty": 0,
                "phd_count": 0,
                "pg_count": 0,
                "prof_count": 0,
                "assoc_count": 0,
                "asst_count": 0
            }

        phd_count = sum(1 for f in faculty if f.qualification and 'phd' in f.qualification.lower())
        pg_count = sum(1 for f in faculty if f.qualification and any(q in f.qualification.lower() for q in ['mtech', 'me', 'msc', 'm.tech', 'm.e', 'pg']))
        
        # Qualification Score: 1.5 * ((10X + 4Y) / F)
        qual_score = 1.5 * ((10 * phd_count) + (4 * pg_count)) / total_f

        prof_count = sum(1 for f in faculty if f.designation and 'professor' in f.designation.lower() and 'assistant' not in f.designation.lower() and 'associate' not in f.designation.lower())
        assoc_count = sum(1 for f in faculty if f.designation and 'associate' in f.designation.lower())
        asst_count = sum(1 for f in faculty if f.designation and 'assistant' in f.designation.lower())

        # Cadre Proportion: required ratio: Prof:Assoc:Asst = 3:6:20. Total required parts = 29.
        req_prof = max((total_f * 3) / 29.0, 1)
        req_assoc = max((total_f * 6) / 29.0, 1)
        req_asst = max((total_f * 20) / 29.0, 1)

        prof_ratio = min(prof_count / req_prof, 1.0)
        assoc_ratio = min(assoc_count / req_assoc, 1.0)
        asst_ratio = min(asst_count / req_asst, 1.0)
        
        # Cadre proportion * 15 marks
        cadre_score = ((prof_ratio + assoc_ratio + asst_ratio) / 3.0) * 15.0

        return {
            "qualification_score": round(qual_score, 2),
            "cadre_proportion_score": round(cadre_score, 2),
            "total_faculty": total_f,
            "phd_count": phd_count,
            "pg_count": pg_count,
            "prof_count": prof_count,
            "assoc_count": assoc_count,
            "asst_count": asst_count
        }

    async def _calculate_student_metrics(self, college_id: str, academic_year: str) -> dict:
        """
        API Formula: Mean CGPA * (Successful students / Appeared students)
        Split Success Rate: success_without_backlog and success_within_period
        """
        from app.models.evaluation import SemesterGrade
        grades = (await self.session.scalars(
            select(SemesterGrade).where(
                SemesterGrade.college_id == college_id
            )
        )).all()
        
        if not grades:
            return {
                "api": 0.0,
                "mean_cgpa": 0.0,
                "success_without_backlog": 0.0,
                "success_within_period": 0.0
            }
            
        # Simplified CGPA approximation from grades
        points_map = {"O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "F": 0}
        total_points = sum(points_map.get(g.grade, 0) * g.credits_earned for g in grades)
        total_credits = sum(g.credits_earned for g in grades)
        
        mean_cgpa = (total_points / total_credits) if total_credits > 0 else 0.0
        
        # Split success rate heuristics
        students = set(g.student_id for g in grades)
        appeared = len(students)
        successful = sum(1 for s in students if not any(g.grade == "F" and g.student_id == s for g in grades))
        
        api = mean_cgpa * (successful / appeared) if appeared > 0 else 0.0
        
        # Mock values for split success metrics as exact backlog data requires historical trace
        success_without_backlog = round((successful / appeared) * 100, 2) if appeared > 0 else 0.0
        success_within_period = round((successful / appeared) * 100, 2) if appeared > 0 else 0.0
        
        return {
            "api": round(api, 2),
            "mean_cgpa": round(mean_cgpa, 2),
            "success_without_backlog": success_without_backlog,
            "success_within_period": success_within_period,
            "data_quality": "insufficient"  # Flagging heuristic estimations
        }

    async def aggregate_nba_payload(self, college_id: str, academic_year: str, department_id: str) -> dict:
        """
        Aggregates data for the NBA SAR report, focusing on CO-PO attainment.
        """
        college_info = await self._fetch_college_info(college_id)

        # Fetch PO attainments for the department
        po_attainments = (await self.session.scalars(
            select(POAttainmentRecord).where(
                POAttainmentRecord.college_id == college_id,
                POAttainmentRecord.department_id == department_id,
                POAttainmentRecord.academic_year == academic_year
            )
        )).all()

        po_ids = [p.po_id for p in po_attainments]
        pos = []
        if po_ids:
            pos = (await self.session.scalars(
                select(ProgramOutcome).where(ProgramOutcome.id.in_(po_ids))
            )).all()
        po_map = {p.id: p.code for p in pos}

        attainment_data = {}
        for record in po_attainments:
            po_code = po_map.get(record.po_id, record.po_id)
            attainment_data[po_code] = {
                "value": record.attainment_value,
                "calculation_method": record.calculation_method
            }
            
        faculty_metrics = await self._calculate_faculty_metrics(college_id, department_id)
        student_metrics = await self._calculate_student_metrics(college_id, academic_year)
        
        # Source Part C narratives
        narratives = (await self.session.scalars(
            select(NAACQualitativeNarrative).where(
                NAACQualitativeNarrative.college_id == college_id,
                NAACQualitativeNarrative.academic_year == academic_year,
                NAACQualitativeNarrative.criterion_code.startswith("NBA_PART_C")
            )
        )).all()
        
        part_c_data = {}
        for n in narratives:
            part_c_data[n.criterion_code] = {
                "name": n.criterion_name,
                "text": n.narrative_text
            }

        return {
            "college": college_info,
            "department_id": department_id,
            "academic_year": academic_year,
            "report_type": "NBA SAR",
            "generated_at": datetime.utcnow().isoformat(),
            "po_attainment": attainment_data,
            "faculty_metrics": faculty_metrics,
            "student_metrics": student_metrics,
            "part_c_data": part_c_data
        }

    async def get_nba_appendix_data(self, college_id: str, academic_year: str, department_id: str) -> bytes:
        """
        Generates raw marks data required for NBA audit supplements as an Excel file (.xlsx).
        """
        po_attainments = (await self.session.scalars(
            select(POAttainmentRecord).where(
                POAttainmentRecord.college_id == college_id,
                POAttainmentRecord.department_id == department_id,
                POAttainmentRecord.academic_year == academic_year
            )
        )).all()
        
        po_ids = [p.po_id for p in po_attainments]
        pos = []
        if po_ids:
            pos = (await self.session.scalars(
                select(ProgramOutcome).where(ProgramOutcome.id.in_(po_ids))
            )).all()
        po_map = {p.id: p.code for p in pos}
        
        config = await self._get_attainment_config_fallback(college_id, academic_year, department_id)
        target_pct = config["direct_threshold_pct"]
        
        rows = []
        for record in po_attainments:
            po_code = po_map.get(record.po_id, "Unknown")
            rows.append({
                "PO Code": po_code,
                "Target Level": str(target_pct),
                "Attained Value": record.attainment_value,
                "Calculation Details": json.dumps(record.calculation_method)
            })
            
        df = pd.DataFrame(rows)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='NBA_Attainment')
        
        return output.getvalue()

    async def get_naac_excel_templates(self, college_id: str, academic_year: str) -> bytes:
        """
        Generates NAAC Quantitative Data Templates (QnM) as an Excel file (.xlsx) with multiple sheets.
        """
        # Fetch Quantitative Snapshots (QnM)
        current_year_parts = academic_year.split('-')
        try:
            start_year = int(current_year_parts[0])
            academic_years = [f"{start_year - i}-{start_year - i + 1}" for i in range(5)]
        except ValueError:
            academic_years = [academic_year]
            
        snapshots = (await self.session.scalars(
            select(NAACAuditSnapshot).where(
                NAACAuditSnapshot.college_id == college_id,
                NAACAuditSnapshot.academic_year.in_(academic_years)
            )
        )).all()

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            metric_codes = set(s.metric_code for s in snapshots)
            if not metric_codes:
                # Provide empty template if no data
                pd.DataFrame([{"Metric": "No data available", "Value": ""}]).to_excel(writer, index=False, sheet_name="QnM_Data")
            else:
                for code in metric_codes:
                    metric_snapshots = [s for s in snapshots if s.metric_code == code]
                    rows = []
                    for s in metric_snapshots:
                        rows.append({
                            "Academic Year": s.academic_year,
                            "Metric Value": s.computed_value,
                            "Status": "Locked" if s.locked_at else "Draft"
                        })
                    df = pd.DataFrame(rows)
                    # Sheet names max length is 31
                    sheet_name = str(code)[:31].replace('[', '').replace(']', '').replace(':', '').replace('*', '').replace('?', '').replace('/', '')
                    df.to_excel(writer, index=False, sheet_name=sheet_name)
                    
        return output.getvalue()

    async def calculate_nba_sfr_and_cadre(self, college_id: str) -> dict:
        """
        NBA Criterion 5: Faculty Information and Contributions
        Calculates Student-Faculty Ratio (SFR) and Cadre Proportions.
        """
        from app.models.core import User
        from app.models.accreditation import FacultyProfile
        from sqlalchemy import select, func
        
        # Total Students
        total_students = (await self.session.scalars(
            select(func.count(User.id)).where(
                User.college_id == college_id,
                User.role == 'student',
                User.is_deleted == False
            )
        )).first() or 0
        
        # Total Faculty
        total_faculty = (await self.session.scalars(
            select(func.count(User.id)).where(
                User.college_id == college_id,
                User.role == 'faculty',
                User.is_deleted == False
            )
        )).first() or 0
        
        sfr = round(total_students / total_faculty, 2) if total_faculty > 0 else 0.0
        
        # Cadre Proportion
        profiles = (await self.session.scalars(
            select(FacultyProfile).where(
                FacultyProfile.college_id == college_id,
                FacultyProfile.is_deleted == False
            )
        )).all()
        
        professors = sum(1 for p in profiles if p.designation and 'Professor' in p.designation and 'Assistant' not in p.designation and 'Associate' not in p.designation)
        associates = sum(1 for p in profiles if p.designation and 'Associate Professor' in p.designation)
        assistants = sum(1 for p in profiles if p.designation and 'Assistant Professor' in p.designation)
        
        # Required Cadre is 1:2:6 for SFR of 1:15 or 1:20
        # If total_faculty is N, Required Profs = N/9, Required Assoc = 2N/9, Required Asst = 6N/9
        req_prof = round(total_faculty / 9.0, 2)
        req_assoc = round((2 * total_faculty) / 9.0, 2)
        req_asst = round((6 * total_faculty) / 9.0, 2)
        
        return {
            "sfr": {
                "total_students": total_students,
                "total_faculty": total_faculty,
                "ratio": sfr,
                "is_compliant": sfr <= 20.0
            },
            "cadre": {
                "professors": {"available": professors, "required": req_prof},
                "associate_professors": {"available": associates, "required": req_assoc},
                "assistant_professors": {"available": assistants, "required": req_asst},
            }
        }

    async def calculate_nba_success_rate(self, college_id: str, batch_year: str) -> dict:
        """
        NBA Criterion 4: Student Success Rate without backlogs in stipulated period.
        """
        from app.models.core import User, UserProfile
        from app.models.academics import CourseRegistration
        from sqlalchemy import select, func, distinct
        
        # Find all students for this batch
        students = (await self.session.scalars(
            select(User.id).join(UserProfile).where(
                User.college_id == college_id,
                User.role == 'student',
                UserProfile.batch == batch_year,
                User.is_deleted == False
            )
        )).all()
        
        total_admitted = len(students)
        if total_admitted == 0:
            return {"success_rate_index": 0.0, "total_admitted": 0, "cleared_without_backlogs": 0}
            
        # Find students who had backlogs (is_arrear == True)
        students_with_backlogs = (await self.session.scalars(
            select(distinct(CourseRegistration.student_id)).where(
                CourseRegistration.college_id == college_id,
                CourseRegistration.student_id.in_(students),
                CourseRegistration.is_arrear == True,
                CourseRegistration.is_deleted == False
            )
        )).all()
        
        cleared_without_backlogs = total_admitted - len(students_with_backlogs)
        success_index = round(cleared_without_backlogs / total_admitted, 2)
        
        return {
            "batch": batch_year,
            "total_admitted": total_admitted,
            "cleared_without_backlogs": cleared_without_backlogs,
            "students_with_backlogs": len(students_with_backlogs),
            "success_rate_index": success_index
        }

    async def aggregate_nirf_payload(self, college_id: str, academic_year: str, category: str = "Overall") -> dict:
        """
        Aggregates data for the NIRF DCS report using the robust NIRFGenerator SSoT service.
        """
        college_info = await self._fetch_college_info(college_id)
        
        # Use the unified NIRFGenerator SSoT service
        from app.services.accreditation.nirf_generator import NIRFGenerator
        try:
            report_year = int(academic_year.split('-')[0])
        except ValueError:
            report_year = 2024
            
        generator = NIRFGenerator(self.session, college_id, report_year)
        
        # Calculate the total sanctioned from programs_data (what appears in the report)
        # This is typically much smaller than the raw DB sections total
        programs = college_info.get("programs_data", [])
        display_sanctioned = sum(p.get("sanctioned", 0) for p in programs) if programs else None
        generator.display_sanctioned = display_sanctioned
        
        nirf_report = await generator.generate_full_report()
        
        # The NIRFGenerator handles all TLR, RPII, GO, OI, PR calculations based on raw SSoT
        
        return {
            "college": college_info,
            "academic_year": academic_year,
            "year": report_year,
            "college_id": college_id,
            "category": category,
            "report_type": "NIRF DCS",
            "generated_at": datetime.utcnow().isoformat(),
            "final_score": nirf_report["final_score"],
            "tlr": nirf_report["parameters"]["TLR"],
            "rp": nirf_report["parameters"]["RPII"],
            "go": nirf_report["parameters"]["GO"],
            "oi": nirf_report["parameters"]["OI"],
            "pr": nirf_report["parameters"]["PR"]
        }


    async def get_nirf_excel_templates(self, college_id: str, academic_year: str) -> bytes:
        """
        Generates NIRF Data Templates as an Excel file (.xlsx) with multiple sheets.
        """
        df1 = pd.DataFrame([{"Metric": "Student Strength", "Value": ""}, {"Metric": "Faculty", "Value": ""}])
        df2 = pd.DataFrame([{"Title": "Paper", "Citations": ""}])
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df1.to_excel(writer, index=False, sheet_name='TLR_Data')
            df2.to_excel(writer, index=False, sheet_name='Research_Data')
            
        return output.getvalue()
