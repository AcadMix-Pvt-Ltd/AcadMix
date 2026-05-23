import asyncio
from sqlalchemy.future import select
from database import AdminSessionLocal
from app.models.core import User

async def main():
    async with AdminSessionLocal() as db:
        result = await db.execute(select(User).where((User.role == 'super_admin') | (User.email.like('%admin%'))))
        users = result.scalars().all()
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}, College ID: {u.college_id}")
            
if __name__ == "__main__":
    asyncio.run(main())
