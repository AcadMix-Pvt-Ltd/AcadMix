import asyncio
import httpx

async def submit():
    url = "http://127.0.0.1:8000/api/v1/auth/login"
    # Wait, the user might not have a test account. I don't know the password.
    pass

if __name__ == '__main__':
    asyncio.run(submit())
