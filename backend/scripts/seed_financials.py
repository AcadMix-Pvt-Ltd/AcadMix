import asyncio
import os
import sys
import random

# Adjust path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.future import select
from database import admin_session_ctx
from app.models.core import College
from app.models.infrastructure import InfrastructureExpenditure

async def run():
    async with admin_session_ctx() as db:
        # Find AITS college
        result = await db.execute(select(College).where(College.domain == "aits.acadmix.org"))
        college = result.scalars().first()
        
        if not college:
            print("College not found.")
            return

        print(f"Seeding financials for {college.name}...")

        years = [2021, 2022, 2023]
        
        capital_categories = [
            "Library",
            "New Equipment for Laboratories",
            "Engineering Workshops",
            "Other expenditure on creation of Capital Assets (excluding land and building)"
        ]
        
        operational_categories = [
            "Salaries (Teaching and Non Teaching staff)",
            "Maintenance of Academic Infrastructure or consumables and other running expenditures (excluding maintenance of hostels and allied services)",
            "Seminars/Conferences/Workshops"
        ]

        await db.execute(InfrastructureExpenditure.__table__.delete().where(InfrastructureExpenditure.college_id == college.id))

        new_records = []
        for year in years:
            base_multiplier = 1.0 + ((year - 2021) * 0.1) # 10% increase each year

            for cat in capital_categories:
                amount = random.uniform(500000, 5000000) * base_multiplier
                new_records.append(
                    InfrastructureExpenditure(
                        college_id=college.id,
                        academic_year=year,
                        category="CAPITAL",
                        actual_expenditure=amount,
                        budgeted_amount=amount * 1.1,
                        # Store the NIRF sub-category in evidence_s3_key as a hack if sub_category column isn't there
                        evidence_s3_key=cat 
                    )
                )

            for cat in operational_categories:
                if "Salaries" in cat:
                    amount = random.uniform(50000000, 100000000) * base_multiplier
                else:
                    amount = random.uniform(1000000, 10000000) * base_multiplier
                    
                new_records.append(
                    InfrastructureExpenditure(
                        college_id=college.id,
                        academic_year=year,
                        category="OPERATIONAL",
                        actual_expenditure=amount,
                        budgeted_amount=amount * 1.1,
                        evidence_s3_key=cat
                    )
                )

        db.add_all(new_records)
        await db.commit()
        print(f"Successfully inserted {len(new_records)} financial records.")

if __name__ == "__main__":
    asyncio.run(run())
