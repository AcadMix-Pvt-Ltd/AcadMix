import asyncio
import os
import sys
import json

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.future import select
from database import admin_session_ctx
from app.models.core import College
from app.services.accreditation.nirf_generator import NIRFGenerator

async def main():
    async with admin_session_ctx() as db:
        result = await db.execute(select(College).where(College.domain == "aits.acadmix.org"))
        college = result.scalars().first()
        
        if not college:
            print("College not found.")
            return

        print(f"Generating NIRF Report for {college.name}...")
        
        generator = NIRFGenerator(db, college.id, 2025)
        report = await generator.generate_full_report()
        
        print(json.dumps(report, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
