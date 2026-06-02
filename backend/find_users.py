import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def find_users():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT email, role, id, college_id FROM users WHERE role IN ('teacher', 'student') LIMIT 10"))
        print(res.fetchall())

if __name__ == "__main__":
    asyncio.run(find_users())
