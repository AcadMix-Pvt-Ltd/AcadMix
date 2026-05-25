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
        
        # Use display_sanctioned if available for consistent student count
        display_sanc = getattr(self, 'display_sanctioned', None)
        if display_sanc:
            N = display_sanc * 4  # total students across all years
        else:
            N = actual_students if actual_students > 0 else 1
        
        # FSR Calculation: FSR = 30 * (20 * (F/N))
        F = faculty_data["regular"] + (0.3 * faculty_data["visiting"])
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
    
    async def calculate_go(self) -> dict:
        """
        Graduation Outcomes (GO) - Weight: 15% (for colleges)
        1a. GPH (Combined metric for Placement & Higher Studies) - 40 marks
        1b. UE (University Examinations) - 40 marks
        1c. MS (Median Salary) - 20 marks
        Total: 100
        """
        from app.models.accreditation import PlacementRecord
        from sqlalchemy.future import select
        from sqlalchemy import func
        
        # Calculate trailing 3 years
        years = [
            f"{self.report_year-3}-{self.report_year-2}",
            f"{self.report_year-2}-{self.report_year-1}",
            f"{self.report_year-1}-{self.report_year}"
        ]
        
        # Note: In a real system, UE depends on exams. We mock UE and focus on GPH & MS.
        # Get sanctioned intake for capping placement numbers
        # Use display_sanctioned (from programs_data, what appears in report) if available
        db_sanctioned, _ = await self.get_sanctioned_intake_vs_actual()
        sanctioned = getattr(self, 'display_sanctioned', None) or db_sanctioned
        
        # Fetch Placement Records for the past 3 years
        placement_data = {}
        total_salary_points = 0.0
        
        for yr in years:
            stmt = select(PlacementRecord).where(
                PlacementRecord.college_id == self.college_id,
                PlacementRecord.academic_year == yr
            )
            res = await self.session.execute(stmt)
            records = res.scalars().all()
            
            raw_placed_count = len(records)
            salaries = sorted([r.package for r in records if r.package])
            
            median_salary = 0.0
            if salaries:
                mid = len(salaries) // 2
                median_salary = (salaries[mid] + salaries[~mid]) / 2.0
            
            # Cap placed to a reasonable number relative to graduating batch
            # sanctioned_intake is for ALL sections; one graduating cohort ~= intake/year
            # For the report, we show the UG 4-year program which has ~120-240 sanctioned
            # Cap to be realistic relative to a single program's graduating batch
            max_graduating_batch = max(200, int(sanctioned / max(1, len(years))))
            placed_count = min(raw_placed_count, int(max_graduating_batch * 0.85))
            
            # Estimate graduating = placed + ~10% higher studies + ~5% others
            higher_studies = max(2, int(placed_count * 0.08))
            graduating = min(max_graduating_batch, placed_count + higher_studies + max(1, int(placed_count * 0.05)))
            
            # Convert median_salary to integer rupees (if stored in LPA, multiply by 100000)
            median_salary_rupees = int(round(median_salary * 100000)) if median_salary < 200 else int(round(median_salary))
                
            placement_data[yr] = {
                "placed_count": placed_count,
                "placed": placed_count,
                "graduating": graduating,
                "higher_studies": higher_studies,
                "median_salary": median_salary_rupees,
                "min_salary": salaries[0] if salaries else 0.0,
                "max_salary": salaries[-1] if salaries else 0.0
            }
            
            # MS is 20 * (Median Salary / Benchmark). Let's say benchmark is 8 LPA for full marks.
            ms_yr = min(20.0, 20.0 * (median_salary / 8.0))
            total_salary_points += ms_yr
            
        ms_score = total_salary_points / 3.0
        
        # GPH relies on (placed + higher studies) / graduated
        # We will assume a static graduation count and higher studies for this prototype
        graduated_base = 3000
        gph_score = 0
        for yr in years:
            # 40 marks max per year
            ratio = min(1.0, placement_data[yr]["placed_count"] / graduated_base)
            gph_score += 40.0 * ratio
        gph_score /= 3.0
        
        ue_score = 35.0 # Mock UE
        
        total_go = gph_score + ue_score + ms_score
        
        return {
            "parameter": "GO",
            "total_score": round(total_go, 2),
            "max_score": 100,
            "components": {
                "GPH": round(gph_score, 2),
                "UE": round(ue_score, 2),
                "MS": round(ms_score, 2)
            },
            "raw_data": {
                "placement_history": placement_data
            }
        }
    
    async def calculate_rpii(self) -> dict:
        from app.models.accreditation import PatentRecord, SponsoredResearchRecord, ConsultancyRecord, ExecutiveDevelopmentProgram
        from sqlalchemy.future import select
        from sqlalchemy import func

        years = [str(self.report_year - 3), str(self.report_year - 2), str(self.report_year - 1)]
        
        # IPR (Patents)
        stmt_patents = select(PatentRecord).where(
            PatentRecord.college_id == self.college_id,
            PatentRecord.calendar_year.in_([int(y) for y in years])
        )
        res_patents = await self.session.execute(stmt_patents)
        patents = res_patents.scalars().all()
        published = len([p for p in patents if p.status == "PUBLISHED"])
        granted = len([p for p in patents if p.status == "GRANTED"])
        
        ipr_score = min(15.0, (published * 1.0) + (granted * 3.0)) # mock logic
        
        # FPPP (Sponsored + Consultancy)
        stmt_spon = select(func.sum(SponsoredResearchRecord.amount_received)).where(
            SponsoredResearchRecord.college_id == self.college_id,
            SponsoredResearchRecord.academic_year.in_(years)
        )
        res_spon = await self.session.execute(stmt_spon)
        sponsored_amount = res_spon.scalar() or 0.0

        stmt_cons = select(func.sum(ConsultancyRecord.amount_received)).where(
            ConsultancyRecord.college_id == self.college_id,
            ConsultancyRecord.academic_year.in_(years)
        )
        res_cons = await self.session.execute(stmt_cons)
        consultancy_amount = res_cons.scalar() or 0.0
        
        stmt_edp = select(func.sum(ExecutiveDevelopmentProgram.annual_earnings)).where(
            ExecutiveDevelopmentProgram.college_id == self.college_id,
            ExecutiveDevelopmentProgram.academic_year.in_(years)
        )
        res_edp = await self.session.execute(stmt_edp)
        edp_amount = res_edp.scalar() or 0.0

        total_earnings = sponsored_amount + consultancy_amount + edp_amount
        fppp_score = min(15.0, 15.0 * (total_earnings / 50000000.0))

        # Mock PU and QP as we don't have SCOPUS/WebOfScience integration yet
        pu_score = 25.0
        qp_score = 20.0
        
        total_rpii = pu_score + qp_score + ipr_score + fppp_score
        
        return {
            "parameter": "RPII",
            "total_score": round(total_rpii, 2),
            "max_score": 100,
            "components": {
                "PU": round(pu_score, 2),
                "QP": round(qp_score, 2),
                "IPR": round(ipr_score, 2),
                "FPPP": round(fppp_score, 2)
            },
            "raw_data": {
                "patents_published": published,
                "patents_granted": granted,
                "sponsored_amount": int(round(sponsored_amount)),
                "consultancy_amount": int(round(consultancy_amount)),
                "edp_amount": int(round(edp_amount))
            }
        }

    async def calculate_oi(self) -> dict:
        demographics = await self.get_student_demographics()
        total_students = demographics["total_students"] or 1
        
        # RD
        other_state = demographics.get("outside_state", 0)
        outside_country = demographics.get("outside_country", 0)
        rd_score = min(30.0, 30.0 * ((other_state + outside_country) / total_students))
        
        # WD
        female_students = demographics.get("female_students", 0)
        wd_score = min(30.0, 30.0 * (female_students / (0.5 * total_students)))
        
        # ESCS
        economically_backward = demographics.get("economically_backward", 0)
        socially_challenged = demographics.get("socially_challenged", 0)
        escs_score = min(20.0, 20.0 * ((economically_backward + socially_challenged) / (0.5 * total_students)))
        
        # PCS
        pcs_score = 20.0 # Assuming all facilities available

        total_oi = rd_score + wd_score + escs_score + pcs_score
        
        return {
            "parameter": "OI",
            "total_score": round(total_oi, 2),
            "max_score": 100,
            "components": {
                "RD": round(rd_score, 2),
                "WD": round(wd_score, 2),
                "ESCS": round(escs_score, 2),
                "PCS": round(pcs_score, 2)
            },
            "raw_data": demographics
        }
    
    async def calculate_pr(self, tlr: dict, rpii: dict, go: dict, oi: dict) -> dict:
        from app.services.llm_gateway import gateway
        import json
        
        context = {
            "TLR_Score": tlr.get("total_score"),
            "RPII_Score": rpii.get("total_score"),
            "GO_Score": go.get("total_score"),
            "OI_Score": oi.get("total_score")
        }
        
        prompt = f"""
        You are an expert AI estimating the NIRF Peer Perception score (PR) for an institution.
        The maximum PR score is 100.
        Based on the following computed metrics for the institution, extrapolate a realistic PR score.
        Institutions with high research (RPII) and graduation outcomes (GO) generally command higher peer perception.
        
        Computed Metrics:
        {json.dumps(context, indent=2)}
        
        Respond ONLY with a raw JSON object in this exact format:
        {{"total_score": float}}
        """
        
        try:
            result = await gateway.complete(
                "nirf_perception", 
                messages=[{"role": "user", "content": prompt}],
                json_mode=True
            )
            import re
            cleaned_result = re.sub(r"^```(?:json)?\s*", "", result.strip(), flags=re.IGNORECASE)
            cleaned_result = re.sub(r"\s*```$", "", cleaned_result, flags=re.IGNORECASE)
            
            try:
                data = json.loads(cleaned_result)
                score = float(data.get("total_score", 50.0))
            except json.JSONDecodeError:
                # Fallback extraction
                match = re.search(r"(\d+(?:\.\d+)?)", cleaned_result)
                score = float(match.group(1)) if match else 50.0
                
            score = min(100.0, max(0.0, score))
        except Exception as e:
            logger.error(f"LLM PR prediction failed: {e}")
            score = 50.0 # fallback
            
        return {"parameter": "PR", "total_score": round(score, 2), "max_score": 100}

    async def generate_full_report(self) -> dict:
        """
        Executes all NIRF parameter calculations and compiles the final report JSON.
        """
        logger.info(f"Generating NIRF Report for College {self.college_id} Year {self.report_year}")
        
        tlr = await self.calculate_tlr()
        go = await self.calculate_go()
        
        rpii = await self.calculate_rpii()
        oi = await self.calculate_oi()
        pr = await self.calculate_pr(tlr, rpii, go, oi)
        
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
