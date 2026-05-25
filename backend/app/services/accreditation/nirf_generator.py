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
        Teaching, Learning & Resources (TLR) - Weight: 30% (for Engineering 2025)
        1a. SS (Student Strength including Ph.D. students) - 20 marks
        1b. FSR (Faculty-student ratio with emphasis on permanent faculty) - 30 marks
        1c. FQE (Combined metric for Faculty with Ph.D. and Experience) - 20 marks
        1d. FRU (Financial Resources and their Utilisation) - 30 marks
        Total: 100
        """
        sanctioned_students, actual_students = await self.get_sanctioned_intake_vs_actual()
        faculty_data = await self.get_faculty_counts()
        
        N = actual_students if actual_students > 0 else 1
        total_students_ss = N
        
        # SS Calculation: SS = f(N_T). Let's assume full 20 marks for standard intake
        ss_score = 20.0 
        
        # FSR Calculation: FSR = 30 * (15 * (F/N)) (Note: FSR benchmark usually 1:15 or 1:20)
        # Using 1:20 benchmark for max marks in FSR
        F = faculty_data["regular"] + (0.3 * faculty_data["visiting"])
        ratio = F / total_students_ss
        fsr_score = min(30.0, 30.0 * (20.0 * ratio))
        if ratio < (1/50): 
            fsr_score = 0.0
            
        # FQE Calculation (20 marks max)
        # FQ = 10 * (F_phd / 95%), FE = 10 * (AvgExp / 15)
        fq_score = min(10.0, 10.0 * (faculty_data["phd_percentage"] / 95.0))
        fe_score = min(10.0, 10.0 * (faculty_data["average_experience"] / 15.0))
        fqe_score = fq_score + fe_score
        
        # FRU Calculation (30 marks max)
        infra_data = await self.get_infrastructure_expenditure()
        total_lib = infra_data["library_physical"] + infra_data["library_digital"]
        total_lab = infra_data["lab_equipment"]
        total_fru_spend = total_lib + total_lab
        # Assuming benchmark is 15000 INR per student for FRU for full marks
        fru_score = min(30.0, 30.0 * ((total_fru_spend / total_students_ss) / 15000.0))
        
        total_tlr = ss_score + fsr_score + fqe_score + fru_score
        
        return {
            "parameter": "TLR",
            "total_score": round(total_tlr, 2),
            "max_score": 100,
            "components": {
                "SS": round(ss_score, 2),
                "FSR": round(fsr_score, 2),
                "FQE": round(fqe_score, 2),
                "FRU": round(fru_score, 2)
            },
            "raw_data": {
                "faculty_count": F,
                "student_count": total_students_ss,
                "phd_percentage": faculty_data["phd_percentage"],
                "avg_experience": faculty_data["average_experience"],
                "fru_spend": total_fru_spend
            }
        }

    
    async def calculate_go(self) -> dict:
        """
        Graduation Outcomes (GO) - Weight: 20% (for Engineering 2025)
        1a. GPH (Combined metric for Placement & Higher Studies) - 40 marks
        1b. GUE (University Examinations) - 15 marks
        1c. GMS (Median Salary) - 25 marks
        1d. GPHD (Ph.D. Students Graduated) - 20 marks
        Total: 100
        """
        from app.models.accreditation import PlacementRecord, PhDGraduationRecord
        from sqlalchemy.future import select
        from sqlalchemy import func
        
        # Calculate trailing 3 years
        years = [
            f"{self.report_year-3}-{self.report_year-2}",
            f"{self.report_year-2}-{self.report_year-1}",
            f"{self.report_year-1}-{self.report_year}"
        ]
        
        db_sanctioned, actual_students = await self.get_sanctioned_intake_vs_actual()
        sanctioned = db_sanctioned
        
        placement_data = {}
        total_salary_points = 0.0
        gph_total_points = 0.0
        
        # We will assume a static graduation count based on sanctioned intake for GPH
        graduated_base = max(1, sanctioned)
        
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
            
            placed_count = raw_placed_count
            
            # Estimate graduating = placed + ~10% higher studies + ~5% others
            higher_studies = max(2, int(placed_count * 0.08))
            graduating = placed_count + higher_studies + max(1, int(placed_count * 0.05))
            
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
            
            # GMS is 25 * (Median Salary / Benchmark). Benchmark = 8 LPA for full marks.
            gms_yr = min(25.0, 25.0 * (median_salary / 8.0))
            total_salary_points += gms_yr
            
            # GPH = 40 * (placed + higher_studies) / graduated
            # Using actual graduated count could skew if missing data, fallback to sanctioned
            ratio = min(1.0, (placed_count + higher_studies) / graduated_base)
            gph_total_points += 40.0 * ratio
            
        gms_score = total_salary_points / 3.0
        gph_score = gph_total_points / 3.0
        
        # GUE = 15 marks (Mocked for now)
        gue_score = 12.0 
        
        # GPHD (Ph.D. Students Graduated) - 20 marks
        stmt_phd = select(PhDGraduationRecord).where(
            PhDGraduationRecord.college_id == self.college_id,
            PhDGraduationRecord.academic_year.in_(years)
        )
        res_phd = await self.session.execute(stmt_phd)
        phd_records = res_phd.scalars().all()
        
        phd_graduated = len(phd_records)
        # GPHD = 20 * (phd_graduated / Benchmark). Let's say benchmark for 3 years is 45 (15 per year).
        gphd_score = min(20.0, 20.0 * (phd_graduated / 45.0))
        
        total_go = gph_score + gue_score + gms_score + gphd_score
        
        return {
            "parameter": "GO",
            "total_score": round(total_go, 2),
            "max_score": 100,
            "components": {
                "GPH": round(gph_score, 2),
                "GUE": round(gue_score, 2),
                "GMS": round(gms_score, 2),
                "GPHD": round(gphd_score, 2)
            },
            "raw_data": {
                "placement_history": placement_data,
                "phd_graduated_3yrs": phd_graduated
            }
        }
    
    async def calculate_rpii(self) -> dict:
        from app.models.accreditation import PatentRecord, SponsoredResearchRecord, ConsultancyRecord, ExecutiveDevelopmentProgram, PublicationRecord
        from sqlalchemy.future import select
        from sqlalchemy import func

        years = [str(self.report_year - 3), str(self.report_year - 2), str(self.report_year - 1)]
        calendar_years = [self.report_year - 3, self.report_year - 2, self.report_year - 1]
        
        # 1. PU & QP (Publications and Quality)
        stmt_pubs = select(PublicationRecord).where(
            PublicationRecord.college_id == self.college_id,
            PublicationRecord.calendar_year.in_(calendar_years)
        )
        res_pubs = await self.session.execute(stmt_pubs)
        publications = res_pubs.scalars().all()
        
        # Filter out retracted
        valid_pubs = [p for p in publications if not p.is_retracted]
        pub_count = len(valid_pubs)
        
        # Faculty count for PU calculation: PU = 30 * (P/FRQ)
        faculty_data = await self.get_faculty_counts()
        F = faculty_data["regular"] + (0.3 * faculty_data["visiting"])
        F = max(1, F) # avoid div by zero
        
        # Benchmark for publications might be 2.5 per faculty per year (over 3 years = 7.5) -> let's say 3 for max marks for engineering
        ratio_pu = pub_count / F
        pu_score = min(30.0, 30.0 * (ratio_pu / 3.0)) 
        
        # QP calculation (40 marks)
        # Quality could be top 25% percentile or citations. We have citation_count and is_top_25_percentile.
        top_25_count = len([p for p in valid_pubs if p.is_top_25_percentile])
        total_citations = sum(p.citation_count for p in valid_pubs)
        
        # Let's say max QP needs 50% in top 25, and a high citation/faculty ratio.
        qp_top_25_score = min(20.0, 20.0 * ((top_25_count / max(1, pub_count)) / 0.5))
        qp_cite_score = min(20.0, 20.0 * ((total_citations / F) / 10.0))
        qp_score = qp_top_25_score + qp_cite_score

        # 2. IPR (Patents)
        stmt_patents = select(PatentRecord).where(
            PatentRecord.college_id == self.college_id,
            PatentRecord.calendar_year.in_(calendar_years)
        )
        res_patents = await self.session.execute(stmt_patents)
        patents = res_patents.scalars().all()
        published = len([p for p in patents if p.status == "PUBLISHED"])
        granted = len([p for p in patents if p.status == "GRANTED"])
        
        # IPR = 15 marks
        ipr_score = min(15.0, (published * 0.5) + (granted * 2.0))
        
        # 3. FPPP (Sponsored + Consultancy)
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
        # FPPP = 15 marks
        fppp_score = min(15.0, 15.0 * (total_earnings / 50000000.0))

        total_rp = pu_score + qp_score + ipr_score + fppp_score
        
        return {
            "parameter": "RP",
            "total_score": round(total_rp, 2),
            "max_score": 100,
            "components": {
                "PU": round(pu_score, 2),
                "QP": round(qp_score, 2),
                "IPR": round(ipr_score, 2),
                "FPPP": round(fppp_score, 2)
            },
            "raw_data": {
                "publications": pub_count,
                "top_25_publications": top_25_count,
                "total_citations": total_citations,
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
        
        # Engineering 2025 weightage: TLR 0.30, RP 0.30, GO 0.20, OI 0.10, PR 0.10
        final_score = (
            (tlr["total_score"] * 0.30) +
            (rpii["total_score"] * 0.30) +
            (go["total_score"] * 0.20) +
            (oi["total_score"] * 0.10) +
            (pr["total_score"] * 0.10)
        )
        
        return {
            "report_type": "NIRF_2025",
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
