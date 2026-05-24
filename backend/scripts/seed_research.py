import asyncio
import os
import sys
import random

# Adjust path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.future import select
from database import admin_session_ctx
from app.models.core import College, User
from app.models.accreditation import (
    ResearchOrganization, 
    PatentRecord, 
    SponsoredResearchRecord, 
    ConsultancyRecord, 
    ExecutiveDevelopmentProgram
)

async def run():
    async with admin_session_ctx() as db:
        # Find AITS college
        result = await db.execute(select(College).where(College.domain == "aits.acadmix.org"))
        college = result.scalars().first()
        
        if not college:
            print("College not found.")
            return

        print(f"Seeding research data for {college.name}...")

        # Fetch faculty
        result = await db.execute(select(User).where(User.college_id == college.id, User.role.in_(["faculty", "teacher", "hod", "principal"])))
        faculty = list(result.scalars().all())
        
        if not faculty:
            print("No faculty found. Run seed_profiles.py first.")
            return

        # Clear old research data
        await db.execute(ResearchOrganization.__table__.delete().where(ResearchOrganization.college_id == college.id))
        await db.execute(PatentRecord.__table__.delete().where(PatentRecord.college_id == college.id))
        await db.execute(SponsoredResearchRecord.__table__.delete().where(SponsoredResearchRecord.college_id == college.id))
        await db.execute(ConsultancyRecord.__table__.delete().where(ConsultancyRecord.college_id == college.id))
        await db.execute(ExecutiveDevelopmentProgram.__table__.delete().where(ExecutiveDevelopmentProgram.college_id == college.id))

        # 1. Organizations
        orgs = [
            ResearchOrganization(college_id=college.id, name="DST", org_type="FUNDING_AGENCY"),
            ResearchOrganization(college_id=college.id, name="AICTE", org_type="FUNDING_AGENCY"),
            ResearchOrganization(college_id=college.id, name="ISRO", org_type="FUNDING_AGENCY"),
            ResearchOrganization(college_id=college.id, name="TCS", org_type="CLIENT"),
            ResearchOrganization(college_id=college.id, name="Infosys", org_type="CLIENT"),
            ResearchOrganization(college_id=college.id, name="Wipro", org_type="CLIENT"),
            ResearchOrganization(college_id=college.id, name="DRDO", org_type="FUNDING_AGENCY"),
        ]
        db.add_all(orgs)
        await db.flush() # To get org IDs
        
        funding_agencies = [o for o in orgs if o.org_type == "FUNDING_AGENCY"]
        clients = [o for o in orgs if o.org_type == "CLIENT"]

        years = ["2021", "2022", "2023"]
        calendar_years = [2021, 2022, 2023]

        new_records = []

        # 2. Patents (approx 15-30 patents)
        patent_titles = ["AI Based Health Monitoring", "Smart IoT Agriculture System", "Blockchain for Supply Chain", "Novel Antenna Design", "Renewable Energy Optimizer"]
        for _ in range(random.randint(15, 30)):
            f = random.choice(faculty)
            new_records.append(
                PatentRecord(
                    college_id=college.id,
                    faculty_id=f.id,
                    title=f"{random.choice(patent_titles)} - Variation {random.randint(1, 100)}",
                    calendar_year=random.choice(calendar_years),
                    status=random.choice(["PUBLISHED", "PUBLISHED", "GRANTED"]) # 2/3 published, 1/3 granted
                )
            )

        # 3. Sponsored Research
        for _ in range(random.randint(20, 40)):
            f = random.choice(faculty)
            org = random.choice(funding_agencies)
            new_records.append(
                SponsoredResearchRecord(
                    college_id=college.id,
                    faculty_id=f.id,
                    org_id=org.id,
                    academic_year=random.choice(years),
                    title=f"Research on {random.choice(patent_titles)}",
                    amount_received=random.uniform(500000, 5000000)
                )
            )

        # 4. Consultancy
        for _ in range(random.randint(20, 50)):
            f = random.choice(faculty)
            org = random.choice(clients)
            new_records.append(
                ConsultancyRecord(
                    college_id=college.id,
                    faculty_id=f.id,
                    org_id=org.id,
                    academic_year=random.choice(years),
                    title=f"Consulting for {org.name} on Systems Integration",
                    amount_received=random.uniform(100000, 1000000)
                )
            )

        # 5. Executive Development Programs
        for y in years:
            for _ in range(random.randint(1, 4)):
                new_records.append(
                    ExecutiveDevelopmentProgram(
                        college_id=college.id,
                        academic_year=y,
                        title=f"Leadership Program {random.randint(1, 50)}",
                        participants=random.randint(15, 50),
                        annual_earnings=random.uniform(200000, 1000000)
                    )
                )

        db.add_all(new_records)
        await db.commit()
        print(f"Successfully inserted {len(new_records)} research/consultancy records.")

if __name__ == "__main__":
    asyncio.run(run())
