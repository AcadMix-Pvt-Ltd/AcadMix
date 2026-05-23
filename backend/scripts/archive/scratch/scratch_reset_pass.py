import asyncio
from sqlalchemy.future import select
from database import AdminSessionLocal
from app.models.core import User
from app.core.security import hash_password

async def main():
    async with AdminSessionLocal() as db:
        result = await db.execute(select(User).where(User.role == 'super_admin'))
        u = result.scalars().first()
        if u:
            new_hash = hash_password("admin123")
            u.password_hash = new_hash
            await db.commit()
            print("Password updated to admin123")
        else:
            print("Super admin not found")
            
if __name__ == "__main__":
    asyncio.run(main())
