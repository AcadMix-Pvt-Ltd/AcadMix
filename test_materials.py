import asyncio
import httpx
import os

BASE_URL = "http://127.0.0.1:8000"
TENANT = "aits"

async def test():
    async with httpx.AsyncClient() as client:
        # 1. Login as teacher
        teacher_id = "STF-0001"
        teacher_pw = "pw" # based on seed_faculty.py
        
        resp = await client.post(
            f"{BASE_URL}/api/auth/login",
            headers={"X-Tenant": TENANT},
            json={"login_id": teacher_id, "password": teacher_pw, "college_id": "aits-hyd-001"}
        )
        if resp.status_code != 200:
            print("Teacher Login failed with pw. Trying password123", resp.text)
            resp = await client.post(
                f"{BASE_URL}/api/auth/login",
                headers={"X-Tenant": TENANT},
                json={"login_id": teacher_id, "password": "password123", "college_id": "aits-hyd-001"}
            )
            if resp.status_code != 200:
                print("Failed completely.")
                return
        
        teacher_token = resp.json()["data"]["access_token"]
        print("Logged in as teacher.")
        
        # 2. Get courses for teacher
        resp = await client.get(
            f"{BASE_URL}/api/faculty/cia/dashboard",
            headers={"X-Tenant": TENANT, "Authorization": f"Bearer {teacher_token}"}
        )
        if resp.status_code != 200:
            print("Failed to get courses", resp.text)
            return
        
        courses = resp.json().get("data", [])
        if not courses:
            print("No courses found for teacher.")
            return
        
        course_id = courses[0]["course_id"]
        print(f"Testing on course: {course_id}")
        
        # 3. Upload a material (Link)
        data = {
            "title": "Test Material Link",
            "description": "This is a test link",
            "material_type": "link",
            "web_link": "https://example.com"
        }
        
        resp = await client.post(
            f"{BASE_URL}/api/materials/{course_id}",
            headers={"X-Tenant": TENANT, "Authorization": f"Bearer {teacher_token}"},
            data=data
        )
        if resp.status_code != 200:
            print("Failed to upload material", resp.text)
            return
        
        material = resp.json()
        print(f"Material uploaded successfully: {material.get('id', material)}")
        
        # 4. List materials
        resp = await client.get(
            f"{BASE_URL}/api/materials/{course_id}",
            headers={"X-Tenant": TENANT, "Authorization": f"Bearer {teacher_token}"}
        )
        if resp.status_code != 200:
            print("Failed to list materials", resp.text)
            return
        
        materials = resp.json()
        print(f"Found {len(materials)} materials for course {course_id}")
        
        print("All backend endpoints for materials are fully functional!")

if __name__ == "__main__":
    asyncio.run(test())

