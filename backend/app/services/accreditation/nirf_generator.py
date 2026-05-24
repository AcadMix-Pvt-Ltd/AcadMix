import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.accreditation.base_generator import BaseAccreditationGenerator

logger = logging.getLogger("acadmix.accreditation.nirf_generator")

class NIRFGenerator(BaseAccreditationGenerator):
    """
    Generates the NIRF 2024 score estimation based on real SSoT data.
    Implements mathematical formulas for Colleges.
    """
    def __init__(self, session: AsyncSession, college_id: str, report_year: int):
        super().__init__(session, college_id, report_year)
        
    async def calculate_tlr(self) -> dict:
        """
        Teaching, Learning & Resources (TLR) - Weight: 40% (for colleges)
        1a. FSR (Faculty-Student Ratio) - 30 marks
        1b. FQE (Faculty with PhD & Exp) - 30 marks
        1c. LL (Library & Lab) - 30 marks
        1d. SEC (Sports & Extracurricular) - 10 marks
        Total: 100
        """
        sanctioned_students, actual_students = await self.get_sanctioned_intake_vs_actual()
        faculty_data = await self.get_faculty_counts()
        
        # FSR Calculation: FSR = 30 * (20 * (F/N))
        F = faculty_data["regular"] + (0.3 * faculty_data["visiting"])
        N = actual_students if actual_students > 0 else 1
        ratio = F / N
        # Max score requires 1:20 ratio
        fsr_score = min(30.0, 30.0 * (20.0 * ratio))
        if ratio < (1/50): # If ratio is worse than 1:50, score is 0
            fsr_score = 0.0
            
        # FQE Calculation: FQ = 15 * (F_phd / 95%), FE = 15 * (AvgExp / 15)
        fq_score = min(15.0, 15.0 * (faculty_data["phd_percentage"] / 95.0))
        fe_score = min(15.0, 15.0 * (faculty_data["average_experience"] / 15.0))
        fqe_score = fq_score + fe_score
        
        # LL Calculation
        infra_data = await self.get_infrastructure_expenditure()
        total_lib = infra_data["library_physical"] + (2 * infra_data["library_digital"])
        total_lab = infra_data["lab_equipment"]
        # Assuming benchmark is 5000 INR per student for Library and 10000 for Lab for full marks
        ll_lib_score = min(15.0, 15.0 * ((total_lib / N) / 5000.0))
        ll_lab_score = min(15.0, 15.0 * ((total_lab / N) / 10000.0))
        ll_score = ll_lib_score + ll_lab_score
        
        # SEC Calculation (Mocked out for now as it requires specific sports event tracking)
        sec_score = 5.0 # baseline
        
        total_tlr = fsr_score + fqe_score + ll_score + sec_score
        
        return {
            "parameter": "TLR",
            "total_score": round(total_tlr, 2),
            "max_score": 100,
            "components": {
                "FSR": round(fsr_score, 2),
                "FQE": round(fqe_score, 2),
                "LL": round(ll_score, 2),
                "SEC": round(sec_score, 2)
            },
            "raw_data": {
                "faculty_count": F,
                "student_count": N,
                "phd_percentage": faculty_data["phd_percentage"],
                "avg_experience": faculty_data["average_experience"],
                "library_spend": total_lib,
                "lab_spend": total_lab
            }
        }
    
    async def generate_full_report(self) -> dict:
        """
        Executes all NIRF parameter calculations and compiles the final report JSON.
        """
        logger.info(f"Generating NIRF Report for College {self.college_id} Year {self.report_year}")
        
        tlr = await self.calculate_tlr()
        
        # TODO: Implement RPII, GO, OI, PR
        # For now, we mock the remaining to complete the end-to-end pipeline
        rpii = {"parameter": "RPII", "total_score": 10.0, "max_score": 100}
        go = {"parameter": "GO", "total_score": 15.0, "max_score": 100}
        oi = {"parameter": "OI", "total_score": 12.0, "max_score": 100}
        pr = {"parameter": "PR", "total_score": 5.0, "max_score": 100}
        
        # Colleges weightage: TLR 0.40, RPII 0.20, GO 0.15, OI 0.15, PR 0.10
        final_score = (
            (tlr["total_score"] * 0.40) +
            (rpii["total_score"] * 0.20) +
            (go["total_score"] * 0.15) +
            (oi["total_score"] * 0.15) +
            (pr["total_score"] * 0.10)
        )
        
        return {
            "report_type": "NIRF_2024",
            "college_id": self.college_id,
            "year": self.report_year,
            "final_score": round(final_score, 2),
            "parameters": {
                "TLR": tlr,
                "RPII": rpii,
                "GO": go,
                "OI": oi,
                "PR": pr
            }
        }
