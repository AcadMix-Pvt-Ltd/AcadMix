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
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func as sqlfunc, extract
from sqlalchemy.orm.attributes import flag_modified

from app.core.config import settings
from app import models

logger = logging.getLogger("acadmix.interview_service")


# ═══════════════════════════════════════════════════════════════════════════════
# Prompt Templates
# ═══════════════════════════════════════════════════════════════════════════════

INTERVIEW_SYSTEM_PROMPT = """You are a senior {interview_type} interviewer conducting a mock interview for a {target_role} position{company_context}. The candidate is a college student preparing for campus placements.

INTERVIEW RULES:
1. Ask ONE question at a time. Wait for the response before asking the next.
2. Start with a warm ice-breaker (e.g., "Tell me about yourself"), then progressively increase difficulty.
3. Ask follow-up questions that probe deeper into the candidate's answer. If they mention a project, ask about specific technical decisions they made.
4. If the answer is vague or surface-level, push for specifics: "Can you elaborate?", "Give me a concrete example.", "What was the time complexity?"
5. Naturally probe resume gaps — if they lack internships, ask about project deadlines. If CGPA is low, ask about practical learning.
6. Mix conceptual questions with scenario-based "What would you do if..." questions.
7. Keep your questions concise (2-3 sentences max). Sound natural, not robotic.
8. You are currently on question {current_question} of approximately {max_questions}. When you reach the last 1-2 questions, naturally wrap up: "For my final question..."
9. End the interview with "Do you have any questions for me?" and evaluate the quality of their question.
10. After EACH student response, internally rate their answer on three dimensions (DO NOT share these ratings with the student — keep them internal):
    - clarity (1-10): How clearly did they communicate?
    - depth (1-10): How deep was their technical/contextual understanding?
    - accuracy (1-10): Were their statements factually correct?

RESUME VERIFICATION:
The resume is the VERIFIED source of truth for all factual claims. If the candidate states something that contradicts their resume (name, CGPA, projects, skills), politely point out the discrepancy. Example: "Interesting — your resume mentions [X], but you said [Y]. Could you clarify?" Never blindly accept verbal claims over resume data.

TONE: Professional but encouraging. Like a friendly senior engineer, not an interrogator. Acknowledge good answers briefly before moving on.

{resume_section}

IMPORTANT: Respond with ONLY your next interview question or follow-up. Do not include ratings, labels, or any meta-commentary in your response. Just speak naturally as an interviewer would."""

FEEDBACK_SYSTEM_PROMPT = """You are an expert interview coach analyzing a completed mock interview transcript. The candidate is a college student preparing for campus placements.

Provide a comprehensive evaluation in the following strict JSON format:
{{
  "overall_score": <number 0-100>,
  "scores": {{
    "technical_depth": <number 0-100>,
    "communication": <number 0-100>,
    "problem_solving": <number 0-100>,
    "confidence": <number 0-100>,
    "clarity": <number 0-100>,
    "domain_knowledge": <number 0-100>
  }},
  "per_question": [
    {{
      "question": "<the question asked>",
      "student_answer_summary": "<brief summary of their answer>",
      "rating": "<strong|average|needs_work>",
      "feedback": "<specific, actionable feedback for this answer>",
      "ideal_answer_hint": "<what a strong answer would include>"
    }}
  ],
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "improvement_tips": [
    "<specific, actionable tip 1>",
    "<specific, actionable tip 2>",
    "<specific, actionable tip 3>"
  ],
  "overall_comment": "<2-3 sentence overall assessment>"
}}

RULES:
- Be honest but constructive. Students need to know where they're weak.
- Reference specific answers from the transcript in your feedback.
- Improvement tips must be actionable (e.g., "Practice explaining hash maps with real-world analogies" not "Study more").
- Return ONLY valid JSON, no markdown, no explanation outside the JSON.
"""


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
    resume_stmt = (
        select(models.ResumeScore.parsed_text)
        .where(
            models.ResumeScore.student_id == user["id"],
            models.ResumeScore.college_id == user["college_id"],
            models.ResumeScore.is_deleted == False,
            models.ResumeScore.parsed_text.isnot(None),
        )
    )
    if resume_id:
        resume_stmt = resume_stmt.where(models.ResumeScore.id == resume_id)
    resume_stmt = resume_stmt.order_by(models.ResumeScore.created_at.desc()).limit(1)
    resume_result = await session.execute(resume_stmt)
    resume_row = resume_result.scalar()
    if resume_row:
        resume_text = resume_row

    # Build system prompt
    company_context = f" at {target_company}" if target_company else ""
    premium_context = "\n".join([
        f"INTERVIEW MODE: {mode}",
        f"ROUND TYPE: {round_type}",
        f"CANDIDATE BRANCH: {branch or 'Not specified'}",
        f"STRICTNESS: {strictness}",
        f"COMPANY ID: {company_id or 'Not linked'}",
    ])
    resume_section = f"CANDIDATE RESUME:\n{resume_text}" if resume_text else "No resume provided. Ask general questions appropriate for a fresh graduate."
    resume_section = f"{premium_context}\n\n{resume_section}"

    system_prompt = INTERVIEW_SYSTEM_PROMPT.format(
        interview_type=interview_type,
        target_role=target_role,
        company_context=company_context,
        current_question=1,
        max_questions=10,
        resume_section=resume_section,
    )

    # Get opening question from AI
    user_name = user.get("full_name", "Candidate").split()[0] if user.get("full_name") else "Candidate"
    opening_prompt = f"""Begin the interview. 
You are speaking to {user_name}.
Your first response MUST be a detailed, welcoming introduction (about 3-5 sentences). 
1. Greet them enthusiastically by name.
2. Introduce yourself naturally as 'Ami', the Senior Technical Recruiter at AcadMix, and state you'll be conducting their mock interview for the {target_role} role.
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
    company_context = f" at {interview.target_company}" if interview.target_company else ""
    if q_number == 1:
        resume_section = f"CANDIDATE RESUME:\n{interview.resume_context}" if interview.resume_context else "No resume provided."
    else:
        resume_section = "CANDIDATE RESUME: [Previously provided. Probe deeper into their responses.]"

    system_prompt = INTERVIEW_SYSTEM_PROMPT.format(
        interview_type=interview.interview_type,
        target_role=interview.target_role,
        company_context=company_context,
        current_question=q_number,
        max_questions=10,
        resume_section=resume_section,
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

    return {
        "ai_response": ai_response,
        "question_number": q_number,
        "max_questions": 10,
        "is_final": q_number >= 10,
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
            {"role": "system", "content": FEEDBACK_SYSTEM_PROMPT},
            {"role": "user", "content": f"Transcript for {interview.interview_type} interview:\n\n{transcript}"},
        ]
        feedback_raw = await call_llm(eval_messages, json_mode=True, max_tokens=2048)
        try:
            feedback = json.loads(feedback_raw)
        except json.JSONDecodeError:
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
