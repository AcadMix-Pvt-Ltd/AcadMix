"""
Interview Service — Business logic for AI mock interview sessions.

Extracted from interview.py router. Handles:
- LLM orchestration (call + streaming)
- Prompt templates for interviews and feedback
- Interview session management (quota, start, message, end, feedback)
- Readiness score calculation

Redis client imported from app.core.security (shared pool — not service-level).
"""
import json
import logging
import hmac
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlencode

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func as sqlfunc, extract
from sqlalchemy.orm.attributes import flag_modified

from app.core.config import settings


def repair_and_load_json(json_str: str) -> dict:
    import re
    import json
    
    cleaned = json_str.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()

    start_idx = cleaned.find("{")
    end_idx = cleaned.rfind("}")
    if start_idx == -1 or end_idx == -1:
        raise ValueError("No valid JSON object found in text")
    
    json_body = cleaned[start_idx:end_idx + 1]

    # Fix trailing commas before closing braces/brackets
    json_body = re.sub(r',\s*([\]}])', r'\1', json_body)

    try:
        return json.loads(json_body)
    except json.JSONDecodeError as de:
        try:
            lines = json_body.split("\n")
            repaired_lines = []
            in_string = False
            for line in lines:
                quotes_count = line.count('"') - line.count('\\"')
                if quotes_count % 2 != 0:
                    in_string = not in_string
                if in_string:
                    repaired_lines.append(line + "\\n")
                else:
                    repaired_lines.append(line)
            repaired_body = "".join(repaired_lines)
            return json.loads(repaired_body)
        except Exception:
            raise de
from app import models

logger = logging.getLogger("acadmix.interview_service")


# ═══════════════════════════════════════════════════════════════════════════════
# Prompt Templates
# ═══════════════════════════════════════════════════════════════════════════════

def get_interview_system_prompt(
    interview_type: str,
    target_role: str,
    company_context: str,
    current_question: int,
    max_questions: int,
    resume_section: str,
    difficulty: str = "intermediate"
) -> str:
    int_type = (interview_type or "").lower()
    
    base_instructions = f"""You are conducting a {difficulty} mock interview for a {target_role} position{company_context}. The candidate is a college student preparing for campus placements.
    
INTERVIEW RULES:
1. Ask ONE question at a time. Wait for the candidate's response before asking the next.
2. Start with a warm ice-breaker, then progressively transition into core rounds.
3. Keep your questions/follow-ups concise (2-3 sentences max). Sound natural and engaging, not like a reading list.
4. You are currently on question {current_question} of approximately {max_questions}. Soft-wrap the interview around question 8 or 9, and wrap up with: "For my final question..."
5. Always end the interview by saying "Do you have any questions for me?" and note their response.
6. Speak in your designated persona. Avoid meta-commentary, bracket placeholders (e.g. [Your Name]), or rating labels. Just talk like a real human interviewer.
7. After EACH student response, internally rate their answer on three dimensions (DO NOT share these ratings with the student — keep them internal):
    - clarity (1-10)
    - depth (1-10)
    - accuracy (1-10)
"""

    resume_instructions = """
RESUME VERIFICATION:
The resume is the VERIFIED source of truth. If the candidate makes statements that contradict their resume (skills, CGPA, projects), call it out politely: "Interesting - your resume mentions [X], but you said [Y]. Can you clarify?" Do not accept verbal exaggeration.
"""

    if int_type == "technical":
        role_instructions = f"""
PERSONA: Arjun Mehta, Tech Lead (Professional, rigorous, friendly but deep technical mind).
FOCUS: Assess deep technical competency, problem-solving, and system design.

BALANCED STRUCTURE (Ensure your questions are balanced across these phases):
1. Conceptual / Oral Questions (First 3-4 questions): Ask about OS (multi-threading, memory), DBMS (indexing, ACID, replication), Networks (TCP/UDP, HTTP), or core OOP. Do NOT open the editor.
2. Coding Challenge (1 question): Ask the student to implement a specific algorithm or data structure. You MUST append `[SHOW_CODE_EDITOR: <language>]` to your prompt.
   * Note: The coding language should match the student's primary language on their resume (e.g., Python, C++, Java). If unknown, default to Python, but let them change it.
3. Debugging Challenge (1 question): Present a buggy code snippet containing a logic or syntax error. Write the buggy code inside a standard markdown code block in your response, and append `[SHOW_CODE_EDITOR: <language>]`. Example:
   "Please look at this Python function. It has a logic bug that causes list index errors. Can you fix it? [SHOW_CODE_EDITOR: python]
   ```python
   def reverse_list(arr):
       # buggy implementation...
   ```"
4. Role-Specific Case Study (1 question): Ask a case study based on the target role:
   * SDE / Backend Developer: Ask a System Design / Scale case study (e.g. Designing a URL shortener, rate-limiter, database indexing/sharding, or API caching). Ask them to draw the system architecture or schema on the whiteboard, and append `[SHOW_WHITEBOARD]`.
   * Data Analyst / Engineer / BI: Ask a Data-Driven business decision case study (e.g. "If Puma wants to set up a showroom in a particular area, what geographical, demographic, competitor, and product-demand factors does the company need to decide/analyze?"). Ask them to sketch out their analysis schema/factors on the whiteboard, and append `[SHOW_WHITEBOARD]`.
   * Frontend Developer / UI: Ask a User Experience, page load speed, or state management optimization case study (e.g. rendering high-res image catalogs or bundle size optimization). Ask them to wireframe their design layout on the whiteboard, and append `[SHOW_WHITEBOARD]`.
5. Code Complexity & Optimization: Once the candidate submits a coding or debugging solution, analyze its time and space complexity.
   - If sub-optimal, ask them: "Excellent job getting a working solution! Can we optimize the time complexity to a better big-O runtime (like O(N)) or reduce space complexity?"
   - If optimal, ask about scale limits, edge cases, concurrency, or trade-offs.
6. Return to Oral: When done with coding/whiteboard tasks, return to verbal dialogue and append `[HIDE_CODE_EDITOR]`.
"""
    elif int_type == "hr":
        role_instructions = """
PERSONA: Ananya Iyer, HR Manager (Warm, professional, assessing cultural fit, aspirations, and values).
FOCUS: Assessment of cultural fit, communication, collaboration style, growth mindset, negotiation skills, and placement expectations.

STRUCTURED STAGES (Ensure you guide the candidate through these phases sequentially):
1. Ice-breaker (Questions 1-2): Warm greeting, building rapport, and a low-stress starter question about background or career aspirations. (Do NOT open editor or whiteboard yet).
2. Situational Conflict (Questions 3-4): Present a scenario highlighting a team conflict or crisis to evaluate communication, empathy, and conflict resolution style.
3. Visual Whiteboard Task (Questions 5-6): Ask the candidate to sketch out either a "5-Year Career Path Roadmap" (milestones, skills) or a "Stakeholder Communication Map" (prioritization in a crisis). You MUST append `[SHOW_WHITEBOARD]` at the end of the question to open the canvas.
4. Salary/Offer Negotiation (Questions 7-8): Introduce a mock job offer with relocation or variable pay components to assess negotiation tactics and professional alignment.
5. Oral Wrap-up (Questions 9-10): Wrap up the interview. Close the whiteboard using `[HIDE_CODE_EDITOR]`, return to oral dialogue, ask a final question, and then ask: "Do you have any questions for me?"

IMPORTANT: During Stage 3, you MUST append the tag `[SHOW_WHITEBOARD]` to trigger the canvas.
"""
    elif int_type == "behavioral":
        role_instructions = """
PERSONA: Dr. Rhea Menon, Behavioural Analyst (Analytical, objective, observing behavioral patterns).
FOCUS: Assess adaptability, leadership, conflict resolution, stress management, and decision-making using the STAR method (Situation, Task, Action, Result).

STRUCTURED STAGES (Guide the candidate through these phases):
1. Ice-breaker (Questions 1-2): Warm intro, overview of project experiences, and basic background verification.
2. STAR Scenario 1 (Questions 3-4): Probing team conflict or deadline pressure (e.g. teammate underperforming) to evaluate communication and collaboration style.
3. Visual Task (Questions 5-6): For questions that benefit from a visual layout (such as mapping a project workflow, crisis escalation path, or team structure), append `[SHOW_WHITEBOARD]` to let the candidate draw it. Keep it oral if no diagram is needed.
4. STAR Scenario 2 (Questions 7-8): Probing action/result under high pressure (e.g. client confrontation, Friday outage) to assess priority handling and ownership.
5. Oral Wrap-up (Questions 9-10): Hiding the whiteboard panel using `[HIDE_CODE_EDITOR]`, final wrap-up question, and candidate Q&A.

IMPORTANT: Only append `[SHOW_WHITEBOARD]` for questions that explicitly benefit from visual diagrams. Keep all other questions strictly oral.
"""
    elif int_type in ("mixed", "full_mock_loop", "mixed_mock"):
        role_instructions = f"""
PERSONA: Vikram Sethi, Executive VP (Experienced, high-level, decisive and professional).
FOCUS: A complete placement-day simulation containing a mix of all rounds.

STRUCTURE (Mimic a complete placement loop):
1. Introduction & Resume walk-through (Oral).
2. Deep Technical / Coding or Debugging question: Present a programming task or buggy block and use `[SHOW_CODE_EDITOR: <language>]`.
3. Case Study (SDE system design OR Data Analytics showroom factors like Puma, depending on role): Present the case study and append `[SHOW_WHITEBOARD]` for sketching.
4. Code Complexity & Optimization: Ask the candidate to analyze and optimize their solution's time and space complexity.
5. Behavioral / HR question: Ask a situational conflict question (using STAR method).
6. Wrap up: Close professionally and ask if they have questions for you.
"""
    else:
        role_instructions = """
PERSONA: Professional AcadMix Interviewer.
FOCUS: Balance conceptual theory, practical problem solving, and behavioral fitness.
"""

    return base_instructions + role_instructions + resume_instructions + f"""
{{resume_section}}

IMPORTANT: Respond with ONLY your next interview question/response in your designated persona. Do not include ratings, system tags, or metadata comments."""

TECHNICAL_FEEDBACK_SYSTEM_PROMPT = """You are an expert interview coach analyzing a completed mock interview transcript. The candidate is a college student preparing for campus placements.

Provide a comprehensive evaluation in the following strict JSON format:
{
  "overall_score": <number 0-100>,
  "scores": {
    "technical_depth": <number 0-100>,
    "communication": <number 0-100>,
    "problem_solving": <number 0-100>,
    "confidence": <number 0-100>,
    "clarity": <number 0-100>,
    "domain_knowledge": <number 0-100>
  },
  "per_question": [
    {
      "question": "<the question asked>",
      "student_answer_summary": "<brief summary of their answer>",
      "rating": "<strong|average|needs_work>",
      "feedback": "<specific, actionable feedback for this answer>",
      "ideal_answer_hint": "<what a strong answer would include>"
    }
  ],
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "improvement_tips": [
    "<specific, actionable tip 1>",
    "<specific, actionable tip 2>",
    "<specific, actionable tip 3>"
  ],
  "overall_comment": "<2-3 sentence overall assessment>"
}

RULES:
- Be honest but constructive. Students need to know where they're weak.
- Reference specific answers from the transcript in your feedback.
- Improvement tips must be actionable (e.g., "Practice explaining hash maps with real-world analogies" not "Study more").
- Return ONLY valid JSON, no markdown, no explanation outside the JSON.
"""

HR_FEEDBACK_SYSTEM_PROMPT = """You are an expert interview coach analyzing a completed behavioral/HR mock interview transcript. The candidate is a college student preparing for campus placements.

Provide a comprehensive evaluation in the following strict JSON format:
{
  "overall_score": <number 0-100>,
  "scores": {
    "cultural_fit": <number 0-100>,
    "conflict_resolution": <number 0-100>,
    "leadership_potential": <number 0-100>,
    "negotiation_skills": <number 0-100>,
    "emotional_intelligence": <number 0-100>
  },
  "per_question": [
    {
      "question": "<the question asked>",
      "student_answer_summary": "<brief summary of their answer>",
      "rating": "<strong|average|needs_work>",
      "feedback": "<specific, actionable feedback for this answer>",
      "ideal_answer_hint": "<what a strong answer would include>"
    }
  ],
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "improvement_tips": [
    "<specific, actionable tip 1>",
    "<specific, actionable tip 2>",
    "<specific, actionable tip 3>"
  ],
  "overall_comment": "<2-3 sentence overall assessment>"
}

RULES:
- Be honest but constructive. Students need to know where they're weak.
- Reference specific answers from the transcript in your feedback.
- Improvement tips must be actionable (e.g., "Practice structured STAR method responses" or similar).
- Return ONLY valid JSON, no markdown, no explanation outside the JSON.
"""

FEEDBACK_SYSTEM_PROMPT = TECHNICAL_FEEDBACK_SYSTEM_PROMPT

def get_feedback_system_prompt(interview_type: str) -> str:
    int_type = (interview_type or "").lower()
    if int_type in ("hr", "behavioral"):
        return HR_FEEDBACK_SYSTEM_PROMPT
    return TECHNICAL_FEEDBACK_SYSTEM_PROMPT


# ═══════════════════════════════════════════════════════════════════════════════
# LLM Helpers — Routed through Production LLM Gateway
# ═══════════════════════════════════════════════════════════════════════════════

async def call_llm(messages: list, model: str = None, json_mode: bool = False, max_tokens: int = 1024) -> str:
    """Route interview LLM calls through the centralized gateway.
    
    Production: Vertex AI (Gemini 2.5 Flash)
    Fallback:   LiteLLM → Groq / Gemini AI Studio
    """
    from app.services.llm_gateway import gateway

    try:
        return await gateway.complete(
            "interview",
            messages,
            json_mode=json_mode,
            max_tokens=max_tokens,
        )
    except Exception as e:
        logger.error("Interview LLM call failed: %s", e)
        raise HTTPException(status_code=502, detail="AI service temporarily unavailable")


async def stream_llm(messages: list, model: str = None):
    """Stream interview LLM responses as SSE events via the gateway."""
    from app.services.llm_gateway import gateway

    try:
        async for chunk in gateway.stream("interview", messages):
            yield f"data: {json.dumps({'token': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"
    except Exception as e:
        logger.error("Interview LLM streaming failed: %s", e)
        yield f"data: {json.dumps({'error': 'AI service temporarily unavailable'})}\n\n"


# ═══════════════════════════════════════════════════════════════════════════════
# Service Methods
# ═══════════════════════════════════════════════════════════════════════════════

async def _fetch_dynamic_company_intel(target_company: str, target_role: str) -> Optional[dict]:
    from app.core.cache import _get_redis
    
    redis = await _get_redis()
    cache_key = f"dynamic_intel:{target_company.lower()}:{target_role.lower()}"
    
    if redis:
        cached = await redis.get(cache_key)
        if cached:
            try:
                return json.loads(cached)
            except:
                pass
                
    prompt = (
        f"Search the web (including Glassdoor, LeetCode, GeeksforGeeks, AmbitionBox, Blind, and Reddit) for the most recent interview questions, "
        f"interview rounds, and technical topics for the {target_role} role at {target_company}. "
        f"Return a strict JSON object with exactly three keys: 'past_questions' (list of strings), 'key_topics' (list of strings), and 'interview_rounds' (list of strings)."
    )
    
    try:
        from app.services.llm_gateway import gateway
        result_text = await gateway.complete(
            purpose="career_tools",
            messages=[{"role": "user", "content": prompt}],
            json_mode=True,
            grounding=True
        )
        
        # Clean up Markdown JSON wrapper if exists
        result_text = result_text.strip()
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
            
        intel = json.loads(result_text)
        
        if redis:
            await redis.set(cache_key, json.dumps(intel), ex=7 * 24 * 3600)  # 7 days TTL
            
        return intel
    except Exception as e:
        logger.error(f"Failed to fetch dynamic company intel for {target_company} / {target_role}: {e}")
        return None

async def get_quota(user: dict, session: AsyncSession) -> dict:
    """Returns the student's remaining mock interview quota for the current month."""
    now = datetime.now(timezone.utc)
    stmt = (
        select(sqlfunc.count(models.MockInterview.id))
        .where(
            models.MockInterview.student_id == user["id"],
            models.MockInterview.college_id == user["college_id"],
            models.MockInterview.is_deleted == False,
            extract("month", models.MockInterview.created_at) == now.month,
            extract("year", models.MockInterview.created_at) == now.year,
        )
    )
    result = await session.execute(stmt)
    used = result.scalar() or 0
    quota = settings.MOCK_INTERVIEW_MONTHLY_QUOTA

    return {
        "used": used,
        "total": quota,
        "remaining": max(0, quota - used),
        "month": now.strftime("%B %Y"),
    }


async def start_interview(req: dict, user: dict, session: AsyncSession) -> dict:
    """Start a new mock interview session."""
    # Check quota
    now = datetime.now(timezone.utc)
    stmt = (
        select(sqlfunc.count(models.MockInterview.id))
        .where(
            models.MockInterview.student_id == user["id"],
            models.MockInterview.college_id == user["college_id"],
            models.MockInterview.is_deleted == False,
            extract("month", models.MockInterview.created_at) == now.month,
            extract("year", models.MockInterview.created_at) == now.year,
        )
    )
    result = await session.execute(stmt)
    used = result.scalar() or 0
    # Temporarily disabled AI limit checks for now as per CTO's instructions
    # if used >= settings.MOCK_INTERVIEW_MONTHLY_QUOTA:
    #     raise HTTPException(status_code=429, detail=f"Monthly interview quota exceeded ({settings.MOCK_INTERVIEW_MONTHLY_QUOTA}/month). Resets next month.")

    interview_type = req.get("interview_type", "technical")
    mode = req.get("mode") or interview_type
    round_type = req.get("round_type") or interview_type
    branch = req.get("branch")
    company_id = req.get("company_id")
    resume_id = req.get("resume_id")
    strictness = req.get("strictness", "balanced")
    target_role = req.get("target_role", "Software Developer")
    target_company = req.get("target_company")
    difficulty = req.get("difficulty", "intermediate")

    # Fetch latest resume text (if available)
    resume_text = ""
    # Try StudentResume (Vault) first
    vault_stmt = (
        select(models.StudentResume.parsed_text)
        .where(
            models.StudentResume.student_id == user["id"],
            models.StudentResume.college_id == user["college_id"],
            models.StudentResume.is_deleted == False,
            models.StudentResume.parsed_text.isnot(None),
        )
    )
    if resume_id:
        vault_stmt = vault_stmt.where(models.StudentResume.id == resume_id)
    vault_stmt = vault_stmt.order_by(models.StudentResume.created_at.desc()).limit(1)
    vault_res = await session.execute(vault_stmt)
    vault_text = vault_res.scalar()
    
    if vault_text:
        resume_text = vault_text
    else:
        # Fallback to ATS ResumeScore
        ats_stmt = (
            select(models.ResumeScore.parsed_text)
            .where(
                models.ResumeScore.student_id == user["id"],
                models.ResumeScore.college_id == user["college_id"],
                models.ResumeScore.is_deleted == False,
                models.ResumeScore.parsed_text.isnot(None),
            )
        )
        if resume_id:
            ats_stmt = ats_stmt.where(models.ResumeScore.id == resume_id)
        ats_stmt = ats_stmt.order_by(models.ResumeScore.created_at.desc()).limit(1)
        ats_res = await session.execute(ats_stmt)
        ats_text = ats_res.scalar()
        if ats_text:
            resume_text = ats_text

    # Build system prompt
    intel = None
    if target_company:
        intel = await _fetch_dynamic_company_intel(target_company, target_role)
        if not intel:
            from app.services.career_service import COMPANY_INTEL
            for c in COMPANY_INTEL:
                if c["name"].lower() == target_company.lower():
                    intel = c
                    break

    if target_company:
        intel_context = ""
        if intel:
            intel_context = (
                f"\n\nACTUAL INTERVIEW INTEL FOR {target_company}:\n"
                f"- Past Questions: {', '.join(intel.get('past_questions', []))}\n"
                f"- Key Topics: {', '.join(intel.get('key_topics', []))}\n"
                f"- Interview Rounds: {', '.join(intel.get('interview_rounds', []))}\n"
                f"You MUST use the 'Past Questions' above or generate extremely similar questions from these 'Key Topics'. "
            )

        company_context = (
            f" at {target_company}.\n\n"
            f"ROLE & COMPANY KNOWLEDGE ACTIVATION:\n"
            f"You must NOT act like a generic interviewer. Internally access your pre-trained knowledge of {target_company}'s exact interviewing playbooks, culture, and technical focus areas specifically for the {target_role} role. You MUST strictly enforce these specific frameworks. Format your questions, follow-ups, and tone to perfectly mimic a real {target_company} interviewer assessing a {target_role}.{intel_context}"
        )
    else:
        company_context = ""
    premium_context = "\n".join([
        f"INTERVIEW MODE: {mode}",
        f"ROUND TYPE: {round_type}",
        f"CANDIDATE BRANCH: {branch or 'Not specified'}",
        f"STRICTNESS: {strictness}",
        f"COMPANY ID: {company_id or 'Not linked'}",
    ])
    resume_section = f"CANDIDATE RESUME:\n{resume_text}" if resume_text else "No resume provided. Ask general questions appropriate for a fresh graduate."
    resume_section = f"{premium_context}\n\n{resume_section}"

    system_prompt = get_interview_system_prompt(
        interview_type=interview_type,
        target_role=target_role,
        company_context=company_context,
        current_question=1,
        max_questions=10,
        resume_section=resume_section,
        difficulty=difficulty,
    )

    # Get opening question from AI
    user_name = user.get("full_name", "Candidate").split()[0] if user.get("full_name") else "Candidate"
    
    interviewer_name = "Arjun Mehta"
    interviewer_role = "Tech Lead"
    if interview_type == "hr":
        interviewer_name = "Ananya Iyer"
        interviewer_role = "HR Manager"
    elif interview_type == "behavioral":
        interviewer_name = "Dr. Rhea Menon"
        interviewer_role = "Behavioural Analyst"
    elif interview_type in ("mixed", "full_mock_loop", "mixed_mock"):
        interviewer_name = "Vikram Sethi"
        interviewer_role = "Executive VP"

    opening_prompt = f"""Begin the interview. 
You are speaking to {user_name}.
Your first response MUST be a detailed, welcoming introduction (about 3-5 sentences). 
1. Greet them enthusiastically by name.
2. Introduce yourself naturally as '{interviewer_name}', the {interviewer_role} at AcadMix, and state you'll be conducting their mock interview for the {target_role} role.
3. Explicitly mention exactly 1 or 2 specific, impressive things you noted from their resume background (do NOT say 'resume background', just mention the actual project or skill naturally).
4. Outline a brief agenda for the interview (confirming background, discussing technical fundamentals, and wrapping up).
5. End by asking a broad ice-breaker about what they've been working on recently or what draws them to this field.
Speak naturally and professionally. Do NOT include any brackets, placeholders, or meta-commentary like '[Your Name]' — seamlessly adopt the persona."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": opening_prompt},
    ]
    first_question = await call_llm(messages)

    # Create the interview record
    conversation = [
        {"role": "assistant", "content": first_question, "timestamp": now.isoformat(), "q_number": 1}
    ]

    interview = models.MockInterview(
        college_id=user["college_id"],
        student_id=user["id"],
        interview_type=interview_type,
        target_role=target_role,
        target_company=target_company,
        difficulty=difficulty,
        resume_context=resume_text or None,
        conversation=conversation,
        question_count=1,
        status="in_progress",
    )
    session.add(interview)
    await session.flush()
    interview_id = interview.id

    return {
        "interview_id": interview_id,
        "first_question": first_question,
        "interview_type": interview_type,
        "target_role": target_role,
        "target_company": target_company,
        "difficulty": difficulty,
        "mode": mode,
        "round_type": round_type,
        "branch": branch,
        "company_id": company_id,
        "resume_id": resume_id,
        "strictness": strictness,
        "question_number": 1,
        "max_questions": 10,
    }


async def send_message(interview_id: str, content: str, user: dict, session: AsyncSession) -> dict:
    """Send the student's response and get the AI's next question."""
    stmt = select(models.MockInterview).where(
        models.MockInterview.id == interview_id,
        models.MockInterview.student_id == user["id"],
        models.MockInterview.college_id == user["college_id"],
        models.MockInterview.status == "in_progress",
    )
    result = await session.execute(stmt)
    interview = result.scalars().first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found or already completed")

    if not content.strip():
        raise HTTPException(status_code=400, detail="Response cannot be empty")

    now = datetime.now(timezone.utc)
    conversation = list(interview.conversation or [])

    # Append student response
    conversation.append({
        "role": "user",
        "content": content.strip(),
        "timestamp": now.isoformat(),
    })

    q_number = interview.question_count + 1

    # Build system prompt with updated question count
    if interview.target_company:
        company_context = (
            f" at {interview.target_company}.\n\n"
            f"ROLE & COMPANY KNOWLEDGE ACTIVATION:\n"
            f"You must NOT act like a generic interviewer. Internally access your pre-trained knowledge of {interview.target_company}'s exact interviewing playbooks, culture, and technical focus areas specifically for the {interview.target_role} role. You MUST strictly enforce these specific frameworks. Format your questions, follow-ups, and tone to perfectly mimic a real {interview.target_company} interviewer assessing a {interview.target_role}."
        )
    else:
        company_context = ""
    if q_number == 1:
        resume_section = f"CANDIDATE RESUME:\n{interview.resume_context}" if interview.resume_context else "No resume provided."
    else:
        resume_section = "CANDIDATE RESUME: [Previously provided. Probe deeper into their responses.]"

    system_prompt = get_interview_system_prompt(
        interview_type=interview.interview_type,
        target_role=interview.target_role,
        company_context=company_context,
        current_question=q_number,
        max_questions=10,
        resume_section=resume_section,
        difficulty=interview.difficulty,
    )

    # ── Context Truncation (cost optimization) ─────────────────────────────
    # Turn 1-5:  Send full conversation
    # Turn 6+:   Send Resume + Summary of earlier turns + Last 5 turns
    # This reduces token costs by ~50% for long interview sessions
    llm_messages = [{"role": "system", "content": system_prompt}]
    if len(conversation) <= 10:  # 5 Q&A pairs = 10 messages
        for msg in conversation:
            llm_messages.append({"role": msg["role"], "content": msg["content"]})
    else:
        # Summarize older turns into a compact context block
        older_turns = conversation[:-10]  # Everything before the last 5 Q&A pairs
        summary_parts = []
        for msg in older_turns:
            label = "Interviewer" if msg["role"] == "assistant" else "Candidate"
            # Truncate each turn to first 100 chars for the summary
            content_brief = msg["content"][:100] + ("..." if len(msg["content"]) > 100 else "")
            summary_parts.append(f"{label}: {content_brief}")
        summary_text = "\n".join(summary_parts)

        # Inject summary as a user context message, then append recent turns
        llm_messages.append({
            "role": "user",
            "content": f"[CONVERSATION SUMMARY — Earlier exchanges]\n{summary_text}\n[END SUMMARY — Continue from here]",
        })
        llm_messages.append({
            "role": "assistant",
            "content": "Understood. I'll continue the interview from where we left off.",
        })
        for msg in conversation[-10:]:
            llm_messages.append({"role": msg["role"], "content": msg["content"]})

    # Get AI response
    ai_response = await call_llm(llm_messages)

    # Append AI response to conversation
    conversation.append({
        "role": "assistant",
        "content": ai_response,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "q_number": q_number,
    })

    # Update interview record
    interview.conversation = conversation
    interview.question_count = q_number
    flag_modified(interview, "conversation")

    # Sync current_stage based on LLM response tags
    if "[SHOW_CODE_EDITOR" in ai_response.upper():
        interview.current_stage = "coding"
        flag_modified(interview, "current_stage")
    elif "[SHOW_WHITEBOARD]" in ai_response.upper():
        interview.current_stage = "whiteboard"
        flag_modified(interview, "current_stage")
    elif "[HIDE_CODE_EDITOR]" in ai_response.upper():
        interview.current_stage = "wrapup"
        flag_modified(interview, "current_stage")

    return {
        "ai_response": ai_response,
        "question_number": q_number,
        "max_questions": 10,
        "is_final": q_number >= 10,
    }


def _normalize_turn_text(value: str) -> str:
    return " ".join((value or "").strip().split()).lower()


def _conversation_question_count(conversation: list) -> int:
    return sum(
        1
        for msg in conversation
        if (
            isinstance(msg, dict)
            and msg.get("role") == "assistant"
            and msg.get("kind", "question") == "question"
        )
    )


async def append_conversation_turns(interview_id: str, req: dict, user: dict, session: AsyncSession) -> dict:
    """Persist finalized LiveKit transcript turns for scoring and history."""
    stmt = select(models.MockInterview).where(
        models.MockInterview.id == interview_id,
        models.MockInterview.student_id == user["id"],
        models.MockInterview.college_id == user["college_id"],
        models.MockInterview.status.in_(["in_progress", "scoring"]),
    )
    result = await session.execute(stmt)
    interview = result.scalars().first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found")

    raw_turns = req.get("turns") or []
    if not isinstance(raw_turns, list):
        raise HTTPException(status_code=400, detail="turns must be a list")

    conversation = list(interview.conversation or [])
    existing_keys = {
        (msg.get("role"), _normalize_turn_text(msg.get("content", "")))
        for msg in conversation
        if isinstance(msg, dict)
    }

    appended = 0
    now = datetime.now(timezone.utc).isoformat()
    for turn in raw_turns:
        if not isinstance(turn, dict):
            continue
        role = turn.get("role")
        content = (turn.get("content") or "").strip()
        if role not in {"assistant", "user"} or not content:
            continue
        kind = turn.get("kind") or ("answer" if role == "user" else "question")
        if kind not in {"question", "answer", "clarification", "nudge"}:
            kind = "answer" if role == "user" else "question"

        key = (role, _normalize_turn_text(content))
        if key in existing_keys:
            continue

        conversation.append({
            "role": role,
            "content": content,
            "timestamp": turn.get("timestamp") or now,
            "source": turn.get("source") or "livekit",
            "kind": kind,
        })
        existing_keys.add(key)
        appended += 1

    if appended:
        interview.conversation = conversation
        interview.question_count = _conversation_question_count(conversation)
        flag_modified(interview, "conversation")
        
        # Scan for state-change tags in appended assistant turns to sync current_stage
        for turn in raw_turns:
            if turn.get("role") == "assistant":
                content_upper = (turn.get("content") or "").upper()
                if "[SHOW_CODE_EDITOR" in content_upper:
                    interview.current_stage = "coding"
                    flag_modified(interview, "current_stage")
                elif "[SHOW_WHITEBOARD]" in content_upper:
                    interview.current_stage = "whiteboard"
                    flag_modified(interview, "current_stage")
                elif "[HIDE_CODE_EDITOR]" in content_upper:
                    interview.current_stage = "wrapup"
                    flag_modified(interview, "current_stage")
                    
        await session.commit()

    return {
        "interview_id": interview.id,
        "appended": appended,
        "question_count": interview.question_count,
        "conversation_count": len(conversation),
    }


async def end_interview(interview_id: str, user: dict, session: AsyncSession) -> dict:
    """End the interview session and queue AI feedback generation."""
    stmt = select(models.MockInterview).where(
        models.MockInterview.id == interview_id,
        models.MockInterview.student_id == user["id"],
        models.MockInterview.college_id == user["college_id"],
        models.MockInterview.status == "in_progress",
    )
    result = await session.execute(stmt)
    interview = result.scalars().first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found or already completed")

    # Mark as scoring (intermediate state)
    interview.status = "scoring"

    # Dispatch feedback generation to background worker
    try:
        from arq.connections import ArqRedis, create_pool, RedisSettings
        pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
        await pool.enqueue_job(
            "generate_interview_feedback_task",
            interview_id,
            user["college_id"],
        )
        await pool.close()
        await session.commit()
        logger.info("Interview feedback queued for background processing: %s", interview_id)
    except Exception as e:
        # Fallback: if ARQ is unavailable, generate inline (blocking)
        logger.warning("ARQ unavailable, generating feedback inline: %s", e)

        now = datetime.now(timezone.utc)
        duration = int((now - interview.created_at.replace(tzinfo=timezone.utc)).total_seconds()) if interview.created_at else 0

        transcript_lines = []
        for msg in (interview.conversation or []):
            role_label = "Interviewer" if msg["role"] == "assistant" else "Candidate"
            transcript_lines.append(f"{role_label}: {msg['content']}")
        transcript = "\n\n".join(transcript_lines)

        eval_messages = [
            {"role": "system", "content": get_feedback_system_prompt(interview.interview_type)},
            {"role": "user", "content": f"Transcript for {interview.interview_type} interview:\n\n{transcript}"},
        ]
        feedback_raw = await call_llm(eval_messages, json_mode=True, max_tokens=2048)
        try:
            feedback = repair_and_load_json(feedback_raw)
        except Exception:
            feedback = {"overall_score": 50, "scores": {}, "overall_comment": "Feedback parsing failed."}

        interview.status = "completed"
        interview.completed_at = now
        interview.duration_seconds = duration
        interview.ai_feedback = feedback
        interview.scores = feedback.get("scores", {})
        interview.overall_score = feedback.get("overall_score", 50)
        flag_modified(interview, "ai_feedback")
        flag_modified(interview, "scores")
        await session.commit()

    return {
        "interview_id": interview.id,
        "status": interview.status,
        "question_count": interview.question_count,
        "message": "Feedback is being generated. Poll GET /interview/{id} for results." if interview.status == "scoring" else "Feedback ready.",
        "overall_score": interview.overall_score,
        "feedback": interview.ai_feedback,
    }


async def get_history(user: dict, session: AsyncSession) -> list:
    """List past interview sessions with scores (no transcript for list view)."""
    stmt = (
        select(models.MockInterview)
        .where(
            models.MockInterview.student_id == user["id"],
            models.MockInterview.college_id == user["college_id"],
            models.MockInterview.is_deleted == False,
        )
        .order_by(models.MockInterview.created_at.desc())
        .limit(50)
    )
    result = await session.execute(stmt)
    interviews = result.scalars().all()

    return [
        {
            "id": i.id,
            "interview_type": i.interview_type,
            "target_role": i.target_role,
            "target_company": i.target_company,
            "difficulty": i.difficulty,
            "overall_score": i.overall_score,
            "question_count": i.question_count,
            "duration_seconds": i.duration_seconds,
            "status": i.status,
            "created_at": i.created_at.isoformat() if i.created_at else None,
            "scores": i.scores,
        }
        for i in interviews
    ]


async def get_readiness(user: dict, session: AsyncSession) -> dict:
    """Calculate aggregate interview readiness score from completed sessions."""
    stmt = (
        select(models.MockInterview)
        .where(
            models.MockInterview.student_id == user["id"],
            models.MockInterview.college_id == user["college_id"],
            models.MockInterview.status == "completed",
            models.MockInterview.is_deleted == False,
        )
        .order_by(models.MockInterview.created_at.desc())
        .limit(10)
    )
    result = await session.execute(stmt)
    interviews = result.scalars().all()

    if not interviews:
        return {
            "readiness_score": 0,
            "total_interviews": 0,
            "avg_score": 0,
            "badge": None,
            "topic_confidence": {},
        }

    scores = [i.overall_score for i in interviews if i.overall_score is not None]
    avg_score = sum(scores) / len(scores) if scores else 0

    # Aggregate dimension scores
    dimensions = ["technical_depth", "communication", "problem_solving", "confidence", "clarity", "domain_knowledge"]
    topic_confidence = {}
    for dim in dimensions:
        dim_scores = []
        for i in interviews:
            if i.scores and dim in i.scores:
                dim_scores.append(i.scores[dim])
        topic_confidence[dim] = round(sum(dim_scores) / len(dim_scores), 1) if dim_scores else 0

    # Check latest resume ATS score
    ats_stmt = (
        select(models.ResumeScore.ats_score)
        .where(
            models.ResumeScore.student_id == user["id"],
            models.ResumeScore.college_id == user["college_id"],
            models.ResumeScore.is_deleted == False,
            models.ResumeScore.ats_score.isnot(None),
        )
        .order_by(models.ResumeScore.created_at.desc())
        .limit(1)
    )
    ats_result = await session.execute(ats_stmt)
    ats_score = ats_result.scalar() or 0

    # Composite readiness: 60% interview avg + 25% ATS + 15% count bonus
    count_bonus = min(len(interviews) * 3, 15)  # up to 15 points for practice
    readiness = round(avg_score * 0.6 + ats_score * 0.25 + count_bonus, 1)
    readiness = min(100, readiness)

    badge = None
    if readiness >= 75:
        badge = "interview_ready"
    elif readiness >= 50:
        badge = "preparing"

    return {
        "readiness_score": readiness,
        "total_interviews": len(interviews),
        "avg_score": round(avg_score, 1),
        "ats_score": ats_score,
        "badge": badge,
        "topic_confidence": topic_confidence,
    }


async def get_detail(interview_id: str, user: dict, session: AsyncSession) -> dict:
    """Get full transcript + feedback for a specific interview session."""
    stmt = select(models.MockInterview).where(
        models.MockInterview.id == interview_id,
        models.MockInterview.student_id == user["id"],
        models.MockInterview.college_id == user["college_id"],
    )
    result = await session.execute(stmt)
    interview = result.scalars().first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    return {
        "id": interview.id,
        "interview_type": interview.interview_type,
        "target_role": interview.target_role,
        "target_company": interview.target_company,
        "difficulty": interview.difficulty,
        "conversation": interview.conversation,
        "ai_feedback": interview.ai_feedback,
        "scores": interview.scores,
        "overall_score": interview.overall_score,
        "question_count": interview.question_count,
        "duration_seconds": interview.duration_seconds,
        "status": interview.status,
        "created_at": interview.created_at.isoformat() if interview.created_at else None,
        "completed_at": interview.completed_at.isoformat() if interview.completed_at else None,
    }

async def process_audio_evaluation(interview_id: str, content: bytes, content_type: str, user: dict, session: AsyncSession, base_url: str) -> dict:
    """Asynchronously evaluate the final audio recording using Assembly AI and merge with scores."""
    stmt = select(models.MockInterview).where(
        models.MockInterview.id == interview_id,
        models.MockInterview.student_id == user["id"],
        models.MockInterview.college_id == user["college_id"],
    )
    result = await session.execute(stmt)
    interview = result.scalars().first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if not settings.ASSEMBLYAI_API_KEY:
        raise HTTPException(status_code=500, detail="AssemblyAI API Key not configured")
    if not settings.ASSEMBLYAI_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="AssemblyAI webhook secret not configured")
    
    import httpx
    
    upload_url = "https://api.assemblyai.com/v2/upload"
    headers = {"authorization": settings.ASSEMBLYAI_API_KEY}
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        upload_resp = await client.post(upload_url, headers=headers, content=content)
        if upload_resp.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to upload audio to AssemblyAI")
        audio_url = upload_resp.json()["upload_url"]
        
        transcript_url = "https://api.assemblyai.com/v2/transcript"
        webhook_query = urlencode({"token": settings.ASSEMBLYAI_WEBHOOK_SECRET})
        webhook_url = f"{base_url.rstrip('/')}/api/v1/interview/assemblyai_webhook?{webhook_query}"
        payload = {
            "audio_url": audio_url,
            "sentiment_analysis": True,
            "disfluencies": True,
            "webhook_url": webhook_url,
        }
        tx_resp = await client.post(transcript_url, headers=headers, json=payload)
        if tx_resp.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to start AssemblyAI transcription")
            
        transcript_id = tx_resp.json()["id"]
        
        feedback = interview.ai_feedback or {}
        feedback["assembly_ai_job_id"] = transcript_id
        feedback["assembly_ai_status"] = "processing"
        
        interview.ai_feedback = feedback
        flag_modified(interview, "ai_feedback")
        await session.commit()
        
        return {"message": "Audio evaluation started", "job_id": transcript_id}


async def handle_assemblyai_webhook(
    payload: dict,
    session: AsyncSession,
    token: str | None = None,
) -> dict:
    """Process the AssemblyAI callback, fetch the transcript metrics, and merge into DB."""
    if (
        not settings.ASSEMBLYAI_WEBHOOK_SECRET
        or not token
        or not hmac.compare_digest(token, settings.ASSEMBLYAI_WEBHOOK_SECRET)
    ):
        raise HTTPException(status_code=401, detail="Invalid AssemblyAI webhook token")

    transcript_id = payload.get("transcript_id")
    status = payload.get("status")
    
    if not transcript_id:
        raise HTTPException(status_code=400, detail="Missing AssemblyAI transcript_id")
    
    # We must do a manual text search or use jsonb contains
    # We will fetch recent interviews and filter manually if the direct query is complex, 
    # but a simple direct query is better:
    stmt = select(models.MockInterview).where(
        models.MockInterview.ai_feedback['assembly_ai_job_id'].astext == transcript_id
    )
    result = await session.execute(stmt)
    interview = result.scalars().first()
    
    if not interview:
        return {"message": "Interview not found for this transcript"}

    feedback = interview.ai_feedback or {}

    if status == "error":
        feedback["assembly_ai_status"] = "failed"
        feedback["assembly_ai_error"] = (
            payload.get("error")
            or payload.get("error_message")
            or "AssemblyAI transcription failed"
        )
        interview.ai_feedback = feedback
        flag_modified(interview, "ai_feedback")
        await session.commit()
        return {"message": "AssemblyAI error recorded"}

    if status != "completed":
        return {"message": "AssemblyAI status ignored", "status": status}
        
    import httpx
    headers = {"authorization": settings.ASSEMBLYAI_API_KEY}
    transcript_url = f"https://api.assemblyai.com/v2/transcript/{transcript_id}"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(transcript_url, headers=headers)
        if resp.status_code != 200:
            feedback["assembly_ai_status"] = "failed"
            feedback["assembly_ai_error"] = f"Failed to fetch AssemblyAI transcript: HTTP {resp.status_code}"
            interview.ai_feedback = feedback
            flag_modified(interview, "ai_feedback")
            await session.commit()
            return {"message": "AssemblyAI transcript fetch failed"}

        data = resp.json()

        # Basic merging of Assembly AI insights
        feedback["assembly_ai_status"] = "completed"
        feedback.pop("assembly_ai_error", None)

        disfluencies_count = sum(
            1
            for word in data.get("words", [])
            if word.get("text", "").lower() in ["um", "uh", "hmm", "mhm"]
        )
        feedback["disfluencies_count"] = disfluencies_count

        # Could also aggregate sentiment here if needed

        interview.ai_feedback = feedback
        flag_modified(interview, "ai_feedback")
        await session.commit()
            
    return {"message": "Success"}
