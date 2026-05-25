import asyncio, os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import admin_session_ctx
from sqlalchemy.future import select
from sqlalchemy import func
from app.models.core import College, User, UserProfile, Section

async def check():
    async with admin_session_ctx() as db:
        result = await db.execute(select(College).where(College.domain == "aits.acadmix.org"))
        college = result.scalars().first()
        if not college:
            print("College not found")
            return

        cid = college.id
        print(f"College: {college.name} (ID: {cid})")

        # Sanctioned intake
        sanc = await db.execute(select(func.sum(Section.intake)).where(Section.college_id == cid, Section.is_deleted == False))
        print(f"Sanctioned intake (sum of all sections): {sanc.scalar()}")

        # Count sections
        sec_count = await db.execute(select(func.count(Section.id)).where(Section.college_id == cid, Section.is_deleted == False))
        print(f"Total sections: {sec_count.scalar()}")

        # Total active students
        act = await db.execute(
            select(func.count(UserProfile.id)).join(User, User.id == UserProfile.user_id)
            .where(UserProfile.college_id == cid, User.role == "student", UserProfile.enrollment_status == "active", User.is_deleted == False)
        )
        print(f"Active students in DB: {act.scalar()}")

        # Gender breakdown
        genders = await db.execute(
            select(UserProfile.gender, func.count(UserProfile.id))
            .join(User, User.id == UserProfile.user_id)
            .where(UserProfile.college_id == cid, User.role == "student", UserProfile.enrollment_status == "active", User.is_deleted == False)
            .group_by(UserProfile.gender)
        )
        for gender, count in genders.all():
            print(f"  Gender '{gender}': {count}")

asyncio.run(check())
