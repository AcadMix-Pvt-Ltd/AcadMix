import asyncio
from sqlalchemy.future import select
from database import AdminSessionLocal
from app.models.core import User
from app.core.security import verify_password

async def main():
    async with AdminSessionLocal() as db:
        result = await db.execute(select(User).where(User.role == 'super_admin'))
        u = result.scalars().first()
        if u:
            print(f"Email: {u.email}")
            print(f"Hash: {u.password_hash}")
            is_valid = verify_password("admin123", u.password_hash)
            print(f"Password 'admin123' valid? {is_valid}")
            
if __name__ == "__main__":
    asyncio.run(main())
