import asyncio, os, sys, json
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.future import select
from database import admin_session_ctx
from app.models.core import College
from app.services.report_engine import ReportEngineService
from jinja2 import Environment, FileSystemLoader

async def validate():
    async with admin_session_ctx() as db:
        result = await db.execute(select(College).where(College.domain == "aits.acadmix.org"))
        college = result.scalars().first()
        if not college:
            print("College not found.")
            return

        engine = ReportEngineService(db)
        payload = await engine.aggregate_nirf_payload(college.id, "2024-2025")
        
        print("=" * 60)
        print("DATA VALIDATION REPORT")
        print("=" * 60)
        
        # Check college info
        c = payload.get("college", {})
        print(f"\n[College] Name: {c.get('name')}")
        print(f"[College] ID: {c.get('id')}")
        print(f"[Academic Year] {payload.get('academic_year')}")
        
        # Programs
        for p in c.get("programs_data", []):
            print(f"  Program: {p['name']} | Sanctioned: {p['sanctioned']} | Admitted: {p['admitted']}")
        
        # Demographics (OI)
        oi = payload.get("oi", {})
        d = oi.get("raw_data", {})
        print(f"\n[Students] Total: {d.get('total_students')} | Male: {d.get('male_students')} | Female: {d.get('female_students')}")
        print(f"  Male + Female = {d.get('male_students',0) + d.get('female_students',0)} (should = Total {d.get('total_students')})")
        
        # Placement (GO)
        go = payload.get("go", {})
        ph = go.get("raw_data", {}).get("placement_history", {})
        print(f"\n[Placement History]")
        for yr, data in ph.items():
            print(f"  {yr}: graduating={data.get('graduating')} placed={data.get('placed')} median_salary={data.get('median_salary')} higher_studies={data.get('higher_studies')}")
        
        # Research (RPII)
        rp = payload.get("rp", {})
        rd = rp.get("raw_data", {})
        print(f"\n[Research] Patents Published: {rd.get('patents_published')} | Granted: {rd.get('patents_granted')}")
        print(f"  Sponsored Amount: {rd.get('sponsored_amount')} (type: {type(rd.get('sponsored_amount')).__name__})")
        print(f"  Consultancy Amount: {rd.get('consultancy_amount')} (type: {type(rd.get('consultancy_amount')).__name__})")
        
        # TLR
        tlr = payload.get("tlr", {})
        td = tlr.get("raw_data", {})
        print(f"\n[TLR] Library Spend: {td.get('library_spend')} | Lab Spend: {td.get('lab_spend')}")
        print(f"  Faculty Count: {td.get('faculty_count')} | Student Count: {td.get('student_count')}")
        
        print(f"\n[Final Score] {payload.get('final_score')}")
        print("=" * 60)

asyncio.run(validate())
