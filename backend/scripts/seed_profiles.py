import asyncio
import os
import sys
import random

# Adjust path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.future import select
from database import admin_session_ctx
from app.models.core import User
from app.models.accreditation import FacultyProfile

async def seed_profiles():
    print("Starting Faculty Profiles Seeding for existing users...")
    async with admin_session_ctx() as session:
        # Find all teacher, hod, principal roles without FacultyProfile
        roles = ["teacher", "hod", "principal"]
        res = await session.execute(
            select(User)
            .where(User.role.in_(roles))
            .where(~User.id.in_(
                select(FacultyProfile.faculty_id)
            ))
        )
        users = res.scalars().all()
        
        count = 0
        for u in users:
            qual = "PhD" if random.random() < 0.6 else "M.Tech"
            fp = FacultyProfile(
                college_id=u.college_id,
                faculty_id=u.id,
                qualification=qual,
                experience_years=random.randint(2, 25),
                joining_date=None,
                designation="Assistant Professor"
            )
            session.add(fp)
            count += 1
            
        await session.commit()
        print(f"Seeded FacultyProfiles for {count} existing users.")

if __name__ == "__main__":
    asyncio.run(seed_profiles())
