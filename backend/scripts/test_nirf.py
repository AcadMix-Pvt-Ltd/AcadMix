import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.future import select
from database import admin_session_ctx
from app.models.core import College
from app.services.accreditation.nirf_generator import NIRFGenerator
from app.services.report_engine import ReportEngineService
from jinja2 import Environment, FileSystemLoader

async def test_nirf():
    async with admin_session_ctx() as db:
        result = await db.execute(select(College).where(College.domain == "aits.acadmix.org"))
        college = result.scalars().first()
        
        if not college:
            print("College not found.")
            return

        engine = ReportEngineService(db)
        payload = await engine.aggregate_nirf_payload(college.id, "2024-2025")
        
        print("Final Score:", payload["final_score"])
        
        # Test Jinja render
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        template_dir = os.path.join(base_dir, "app", "templates")
        env = Environment(loader=FileSystemLoader(template_dir))
        template = env.get_template("nirf_dcs_template.html")
        html_out = template.render(payload)
        
        print("Template rendered successfully! Length of HTML:", len(html_out))

if __name__ == "__main__":
    asyncio.run(test_nirf())
