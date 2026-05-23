import asyncio
import httpx

async def main():
    async with httpx.AsyncClient(timeout=30) as client:
        # First login as admin
        resp = await client.post("http://localhost:8000/api/v1/auth/login", json={
            "login_id": "admin@acadmix",
            "password": "password123"
        })
        if resp.status_code != 200:
            print("Login failed:", resp.text)
            return
        token = resp.json()["data"]["access_token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        # Hit insights endpoint
        query = "students with attendance below 50%"
        resp = await client.post("http://localhost:8000/api/v1/insights/query", json={
            "message": query,
            "session_history": [],
            "active_college_id": None
        }, headers=headers)
        
        print("Status:", resp.status_code)
        print("Response:", resp.json())

if __name__ == "__main__":
    asyncio.run(main())
