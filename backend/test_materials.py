import os
import time
import requests
from datetime import timedelta
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.config import settings
from app.core.security import create_access_token

BASE_URL = "http://127.0.0.1:8000"
TENANT = "aits"

async def get_token_and_course():
    engine = create_async_engine(settings.DATABASE_URL, connect_args={'statement_cache_size': 0})
    SessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with SessionLocal() as db:
        res = await db.execute(text("SELECT id, email, role, college_id FROM users WHERE role = 'teacher' LIMIT 1"))
        user = res.fetchone()
        if not user:
            return None, None
            
        token = create_access_token(user_id=user.id, role=user.role, tenant_id=user.college_id)
        return token, user.college_id

def test():
    loop = asyncio.get_event_loop()
    token, college_id = loop.run_until_complete(get_token_and_course())
    
    if not token:
        print("No teacher found.")
        return
        
    print(f"Token obtained for college: {college_id}")
    
    headers = {"X-Tenant": TENANT, "Authorization": f"Bearer {token}"}
    
    # Let's hit the health endpoint first
    try:
        r = requests.get(f"{BASE_URL}/api/v1/health", headers=headers, timeout=5)
        print("Health status:", r.status_code, r.text)
    except Exception as e:
        print("Health check failed:", e)

    course_id = "test-course-id-123"
    print(f"Testing on course: {course_id}")
    
    # Upload material
    data = {
        "title": "Test Material",
        "description": "Auto-generated",
        "material_type": "link",
        "web_link": "https://test.com"
    }
    
    r = requests.post(f"{BASE_URL}/api/materials/{course_id}", headers=headers, data=data, timeout=5)
    print("Upload Response:", r.status_code, r.text)
    
    # List materials
    r = requests.get(f"{BASE_URL}/api/materials/{course_id}", headers=headers, timeout=5)
    print("List Response:", r.status_code, r.text)

if __name__ == "__main__":
    test()

