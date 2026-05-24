import asyncio
import os
import sys

# Adjust path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.future import select
from sqlalchemy import func
from database import admin_session_ctx
from app.models.core import User
from app.models.accreditation import FacultyProfile

async def check():
    async with admin_session_ctx() as db:
        # Check profiles for teachers
        stmt = select(func.count(FacultyProfile.id)).join(User, User.id == FacultyProfile.faculty_id).where(User.role == 'teacher')
        fc_teacher = await db.scalar(stmt)
        print(f"FacultyProfiles linked to 'teacher': {fc_teacher}")

if __name__ == "__main__":
    asyncio.run(check())
