import asyncio
import os
import sys
import random
import uuid

# Adjust path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.future import select
from database import admin_session_ctx
from app.models.core import User, College
from app.models.accreditation import FacultyProfile

async def seed_faculty():
    print("Starting Faculty Seeding...")
    async with admin_session_ctx() as session:
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

        # Check existing faculty
        res = await session.execute(select(User).where(User.college_id == college_id, User.role == "faculty"))
        faculty = list(res.scalars().all())
        
        if len(faculty) < 150:
            print("Generating 150 dummy faculty members to meet NIRF FSR benchmark...")
            for i in range(150):
                u_id = uuid.uuid4().hex
                u = User(
                    id=u_id,
                    college_id=college_id,
                    name=f"Prof. {i}",
                    email=f"faculty{i}@acadmix.org",
                    role="faculty",
                    password_hash="pw"
                )
                session.add(u)
                await session.flush()
                
                # Determine qualification (say 60% PhD to get a good FQE score)
                qual = "PhD" if random.random() < 0.6 else "M.Tech"
                
                fp = FacultyProfile(
                    college_id=college_id,
                    faculty_id=u_id,
                    qualification=qual,
                    experience_years=random.randint(2, 25),
                    joining_date=None,
                    designation="Assistant Professor"
                )
                session.add(fp)
            
            await session.commit()
            print("✅ Seeded 150 dummy faculty and their profiles.")
        else:
            print(f"Found {len(faculty)} faculty. No seeding needed.")

    print("Seed completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_faculty())
