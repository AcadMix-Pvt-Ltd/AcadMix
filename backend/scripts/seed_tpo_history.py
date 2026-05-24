import asyncio
import os
import sys
import random
from datetime import datetime, timedelta
import uuid

# Adjust path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from database import admin_session_ctx
from app.models.core import User, College
from app.models.alumni_industry import Company, PlacementDrive, PlacementApplication
from app.models.accreditation import PlacementRecord

COMPANIES = [
    {"name": "TCS", "sector": "IT Services", "pkg": 3.5},
    {"name": "Infosys", "sector": "IT Services", "pkg": 3.6},
    {"name": "Wipro", "sector": "IT Services", "pkg": 3.5},
    {"name": "Cognizant", "sector": "IT Services", "pkg": 4.0},
    {"name": "Accenture", "sector": "IT Services", "pkg": 4.5},
    {"name": "Deloitte", "sector": "Consulting", "pkg": 7.5},
    {"name": "Amazon", "sector": "Product", "pkg": 24.0},
    {"name": "Microsoft", "sector": "Product", "pkg": 42.0},
    {"name": "Google", "sector": "Product", "pkg": 40.0},
    {"name": "Oracle", "sector": "Product", "pkg": 18.0},
]

YEARS = ["2021-2022", "2022-2023", "2023-2024"]

async def seed_tpo_history():
    print("Starting TPO History Seeding...")
    async with admin_session_ctx() as session:
        # Get admin college
        from dotenv import load_dotenv
        load_dotenv()
        
        # Find a college that has students
        res = await session.execute(select(College))
        colleges = res.scalars().all()
        college = None
        
        for c in colleges:
            count_res = await session.execute(select(User).where(User.college_id == c.id, User.role == "student"))
            if count_res.scalars().first():
                college = c
                break
                
        if not college:
            print(f"Error: No college with students found in DB.")
            return
            
        college_id = college.id
        print(f"Using college_id: {college_id}")

        # Fetch students
        res = await session.execute(select(User).where(User.college_id == college_id, User.role == "student"))
        students = list(res.scalars().all())

        print(f"Found {len(students)} students.")

        for year in YEARS:
            print(f"\nSeeding academic year: {year}")
            base_year = int(year.split('-')[0])
            
            # Create Companies and Drives
            drive_map = {}
            for comp_data in COMPANIES:
                # Get or create company
                res = await session.execute(select(Company).where(Company.name == comp_data["name"], Company.college_id == college_id))
                company = res.scalars().first()
                if not company:
                    company = Company(college_id=college_id, name=comp_data["name"], sector=comp_data["sector"])
                    session.add(company)
                    await session.flush()

                # Determine a random date in that academic year (August to May)
                month = random.choice([8, 9, 10, 11, 12, 1, 2, 3, 4, 5])
                d_year = base_year if month >= 8 else base_year + 1
                drive_date = datetime(d_year, month, random.randint(1, 28))

                drive = PlacementDrive(
                    college_id=college_id,
                    company_id=company.id,
                    drive_type="on-campus",
                    role_title="Software Engineer",
                    package_lpa=comp_data["pkg"] * random.uniform(0.9, 1.2), # Slight variation
                    drive_date=drive_date,
                    status="completed"
                )
                session.add(drive)
                await session.flush()
                drive_map[company.id] = {"drive": drive, "pkg": drive.package_lpa, "name": company.name, "date": drive_date}

            # Distribute placements
            placed_count = 0
            # Let's say ~75% of students get placed each year
            pool = students.copy()
            random.shuffle(pool)
            target_placed = int(len(pool) * 0.75)
            
            for i in range(target_placed):
                student = pool[i]
                
                # Pick a random drive, weighted heavily towards mass recruiters
                comps = list(drive_map.values())
                weights = [20 if c["pkg"] < 6 else 5 if c["pkg"] < 15 else 1 for c in comps]
                selected_drive_info = random.choices(comps, weights=weights, k=1)[0]
                drive = selected_drive_info["drive"]
                pkg = selected_drive_info["pkg"]
                c_name = selected_drive_info["name"]
                
                # Create Application
                app = PlacementApplication(
                    college_id=college_id,
                    student_id=student.id,
                    drive_id=drive.id,
                    status="selected",
                    offer_details={
                        "ctc": pkg,
                        "role": "Software Engineer",
                        "location": random.choice(["Bangalore", "Hyderabad", "Pune", "Chennai", "Gurgaon"])
                    }
                )
                session.add(app)
                
                # Create Accreditation SSoT Record
                pr = PlacementRecord(
                    college_id=college_id,
                    student_id=student.id,
                    academic_year=year,
                    company_name=c_name,
                    package=pkg,
                    placed_on=selected_drive_info["date"].date()
                )
                session.add(pr)
                placed_count += 1

            await session.commit()
            print(f"-> Placed {placed_count} students out of {len(students)}.")

    print("\n✅ Seed completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_tpo_history())
