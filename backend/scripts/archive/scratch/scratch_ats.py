import asyncio
from app.services.llm_gateway import _vertex_complete
from app.services.resume_service import ATS_SCORING_PROMPT

async def main():
    prompt = ATS_SCORING_PROMPT.format(
        target_role="Software Developer",
        resume_text="I am a software developer.",
        jd_section="",
    )
    messages = [
        {"role": "system", "content": "You are an expert ATS analyzer. Return only valid JSON."},
        {"role": "user", "content": prompt},
    ]
    from app.services.llm_gateway import gateway
    from app.services.resume_service import parse_json_robust
    raw = await gateway.complete("ats_scoring", messages, json_mode=False)
    print(f"RAW LENGTH: {len(raw)}")
    print("GW RESPONSE:")
    print(raw)
    parsed = parse_json_robust(raw)
    if parsed:
        print("PARSED: YES")
    else:
        print("PARSED: NO")

if __name__ == "__main__":
    asyncio.run(main())
