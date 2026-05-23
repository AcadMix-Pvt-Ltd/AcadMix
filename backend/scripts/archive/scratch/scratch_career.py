import asyncio
from app.services import career_service

async def test_career_tools():
    try:
        print("Testing generate_cover_letter...")
        result = await career_service.generate_cover_letter(
            target_role="Software Engineer",
            user_name="John Doe",
            company_name="Google",
            resume_text="I know Python and React.",
            job_description="Looking for Python developers",
            tone="Professional"
        )
        print("SUCCESS:\n")
        print(result)
        
    except Exception as e:
        print("FAIL:", e)

if __name__ == "__main__":
    asyncio.run(test_career_tools())
