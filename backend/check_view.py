import asyncio
from sqlalchemy import text
from database import AdminSessionLocal

async def check():
    async with AdminSessionLocal() as db:
        res = await db.execute(text("SELECT matviewname, definition FROM pg_matviews WHERE matviewname = 'mv_attendance_by_dept'"))
        row = res.fetchone()
        if row:
            print("MATERIALIZED VIEW:")
            print(row[1])
            return
            
        res = await db.execute(text("SELECT viewname, definition FROM pg_views WHERE viewname = 'mv_attendance_by_dept'"))
        row = res.fetchone()
        if row:
            print("REGULAR VIEW:")
            print(row[1])

if __name__ == "__main__":
    asyncio.run(check())
