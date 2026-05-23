import asyncio
import os
import json
from dotenv import load_dotenv

# Load env before importing app
load_dotenv()

import logging

logging.basicConfig(level=logging.INFO)

from app.services.llm_gateway import gateway

async def test_route(name, purpose, prompt):
    print(f"Testing {name} (purpose: {purpose})")
    try:
        res = await gateway.complete(purpose, [{"role": "user", "content": prompt}])
        print(f"PASS Response from {name}: {res}")
    except Exception as e:
        print(f"FAIL Failed natively and fallback: {e}")
    print("-" * 60)

async def main():
    await test_route("2.0 flash lite", "career_tools", "Hi, respond with exactly: I am 2.0 flash lite")
    await test_route("2.0 flash (erp_insights)", "erp_insights", "Hi, respond with exactly: I am 2.0 flash")
    await test_route("2.5 flash", "interview", "Hi, respond with exactly: I am 2.5 flash")
    await test_route("2.5 pro", "erp_complex", "Hi, respond with exactly: I am 2.5 pro")
    await test_route("2.5 pro fallback", "erp_last_resort", "Hi, respond with exactly: I am Gemini Fallback")

if __name__ == "__main__":
    asyncio.run(main())
