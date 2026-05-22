"""
Career Service — Business logic for AI-powered career prep tools.

Extracted from career_tools.py router to enforce thin-router architecture.
Handles: LLM orchestration, Redis caching, prompt templates, JSON parsing.

Redis client is imported from app.core.security (shared pool — not service-level).
"""
import json
import re
import hashlib
import logging
from typing import Optional, List

from fastapi import HTTPException

from app.core.config import settings

logger = logging.getLogger("acadmix.career_service")


# ═══════════════════════════════════════════════════════════════════════════════
# LLM + Caching Core
# ═══════════════════════════════════════════════════════════════════════════════

async def _get_redis():
    """Get the shared Redis client. Returns None if unavailable."""
    try:
        from app.core.security import redis_client
        return redis_client
    except Exception:
        return None


async def call_llm(
    messages: list,
    json_mode: bool = False,
    temperature: float = 0.3,
    max_tokens: int = 4096,
) -> str:
    """Call the LLM with Redis SHA-256 caching (24h TTL).

    Production: AWS Bedrock Nova Lite (via LLM Gateway)
    Fallback:   LiteLLM → Groq / Gemini AI Studio
    
    Uses the shared redis_client from app.core.security — one pool, not N.
    """
    from app.services.llm_gateway import gateway

    # ── Cache Lookup ──────────────────────────────────────────────────────────
    r = await _get_redis()
    cache_key = ""
    if r:
        payload = json.dumps(messages, sort_keys=True)
        digest = hashlib.sha256(f"career_tools:{payload}".encode()).hexdigest()
        cache_key = f"career_cache:{digest}"
        try:
            cached = await r.get(cache_key)
            if cached:
                logger.info("Career tool cache HIT for %s", cache_key[:40])
                return cached
        except Exception:
            pass

    # ── LLM Call via Gateway ─────────────────────────────────────────────────
    try:
        content = await gateway.complete(
            "career_tools",
            messages,
            json_mode=json_mode,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        # ── Cache Write (24h TTL)
        if r and cache_key:
            try:
                await r.set(cache_key, content, ex=86400)
            except Exception:
                pass

        return content
    except Exception as e:
        logger.error("Career tools LLM call failed: %s", e)
        raise HTTPException(status_code=502, detail="AI service temporarily unavailable")


def parse_json(raw: str) -> dict:
    """Robust JSON extraction from LLM output.

    Handles markdown fencing, trailing commas, and partial JSON.
    """
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
        cleaned = re.sub(r'\s*```$', '', cleaned)
    cleaned = re.sub(r',\s*([}\]])', r'\1', cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    try:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            extracted = re.sub(r',\s*([}\]])', r'\1', match.group())
            return json.loads(extracted)
    except json.JSONDecodeError:
        pass

    logger.warning("Career tools: unparseable JSON (first 300): %s", raw[:300])
    return {}


# ═══════════════════════════════════════════════════════════════════════════════
# Tool Implementations
# ═══════════════════════════════════════════════════════════════════════════════

async def generate_cover_letter(
    target_role: str,
    user_name: str,
    company_name: Optional[str] = None,
    job_description: Optional[str] = None,
    resume_text: Optional[str] = None,
    tone: str = "professional",
) -> dict:
    """Generate a tailored cover letter for a specific role and company."""
    company_section = f'\nTARGET COMPANY: {company_name}' if company_name else ''
    jd_section = f'\nJOB DESCRIPTION:\n{job_description}' if job_description else ''
    resume_section = f'\nCANDIDATE RESUME:\n{resume_text[:3000]}' if resume_text else ''

    prompt = f"""Write a professional cover letter for the following position.

TARGET ROLE: {target_role}{company_section}{jd_section}{resume_section}

CANDIDATE NAME: {user_name}

TONE: {tone}

Return valid JSON:
{{
  "subject_line": "<email subject line>",
  "greeting": "<Dear Hiring Manager / Dear [Company] Team>",
  "opening_paragraph": "<hook — why you're excited about this role, 2-3 sentences>",
  "body_paragraph": "<your relevant skills, projects, and achievements mapped to the role, 3-4 sentences>",
  "closing_paragraph": "<call to action, enthusiasm, availability, 2-3 sentences>",
  "sign_off": "<Sincerely, [Name]>",
  "full_letter": "<the complete cover letter as a single string with proper formatting>"
}}

Guidelines:
- Keep the letter under 350 words
- Avoid generic phrases like "I am writing to apply"
- Reference specific skills relevant to {target_role}
- If a JD is provided, mirror its key requirements
- If resume text is provided, reference specific projects/achievements from it
- Sound human, not robotic

Return ONLY valid JSON."""

    messages = [
        {"role": "system", "content": "You are a career counselor who writes compelling, personalized cover letters. Return only valid JSON."},
        {"role": "user", "content": prompt},
    ]

    raw = await call_llm(messages, json_mode=True, temperature=0.5)
    result = parse_json(raw)

    if not result.get("full_letter"):
        result["full_letter"] = raw  # fallback: return raw text

    return result


async def analyze_job_description(
    job_description: str,
    resume_text: Optional[str] = None,
) -> dict:
    """Analyze a job description to extract key requirements and insights."""
    resume_section = f'\n\nCANDIDATE RESUME (for gap analysis):\n{resume_text[:3000]}' if resume_text else ''

    prompt = f"""Analyze this job description thoroughly. Extract structured insights a student needs to prepare their application.

JOB DESCRIPTION:
{job_description}{resume_section}

Return valid JSON:
{{
  "role_title": "<extracted job title>",
  "company": "<company name if mentioned, else null>",
  "experience_level": "<entry/mid/senior>",
  "must_have_skills": ["<skill 1>", "<skill 2>", ...],
  "nice_to_have_skills": ["<skill 1>", "<skill 2>", ...],
  "key_responsibilities": ["<responsibility 1>", ...],
  "red_flags": ["<any concerning language like 'fast-paced' = overwork, 'wear many hats' = understaffed, etc.>"],
  "culture_hints": ["<positive or neutral culture signals from the JD>"],
  "salary_estimate": "<estimated salary range based on role/location/level, or 'Not mentioned'>",
  "application_tips": [
    "<specific tip for tailoring resume to this JD>",
    "<specific tip for tailoring resume to this JD>",
    "<specific tip for tailoring resume to this JD>"
  ],
  "match_assessment": "<if resume provided: brief assessment of candidate's fit. Otherwise: 'Provide your resume for personalized match analysis'>"
}}

Be specific and actionable. For red_flags, only flag genuinely concerning language — don't flag normal job requirements.
Return ONLY valid JSON."""

    messages = [
        {"role": "system", "content": "You are a career strategist who decodes job descriptions. Return only valid JSON."},
        {"role": "user", "content": prompt},
    ]

    raw = await call_llm(messages, json_mode=True, temperature=0.2)
    return parse_json(raw) or {"error": "Could not analyze this JD. Please try again."}


async def draft_cold_email(
    purpose: str,
    target_company: str,
    target_role: str,
    user_name: str,
    recipient_role: Optional[str] = None,
    context: Optional[str] = None,
) -> dict:
    """Generate a professional cold email or referral request."""
    purpose_labels = {
        "referral": "asking for an employee referral",
        "introduction": "introducing yourself for a potential opportunity",
        "follow_up": "following up after an interview or networking event",
        "thank_you": "thanking the interviewer after an interview round",
    }

    prompt = f"""Write a professional email for the following scenario:

PURPOSE: {purpose_labels.get(purpose, purpose)}
SENDER: {user_name} (college student/fresh graduate)
RECIPIENT ROLE: {recipient_role or 'Employee/Recruiter'}
TARGET COMPANY: {target_company}
TARGET ROLE: {target_role}
ADDITIONAL CONTEXT: {context or 'None'}

Return valid JSON:
{{
  "subject_line": "<compelling email subject, under 60 characters>",
  "body": "<the complete email body with proper line breaks. Use \\n for line breaks.>",
  "tips": [
    "<tip for personalizing this email further>",
    "<tip for personalizing this email further>",
    "<tip for personalizing this email further>"
  ]
}}

Rules:
- Keep the email under 150 words (people don't read long cold emails)
- Be specific about why you're reaching out to THIS company
- For referrals: mention what value you bring, don't just ask for favors
- For follow-ups: reference something specific from the conversation
- Include a clear, low-commitment call to action
- Sound genuine, not templated

Return ONLY valid JSON."""

    messages = [
        {"role": "system", "content": "You are a networking coach who writes concise, effective professional emails. Return only valid JSON."},
        {"role": "user", "content": prompt},
    ]

    raw = await call_llm(messages, json_mode=True, temperature=0.5)
    return parse_json(raw) or {"error": "Could not generate email. Please try again."}


async def analyze_skill_gap(
    target_role: str,
    current_skills: Optional[List[str]] = None,
    keywords_found: Optional[List[str]] = None,
    keywords_missing: Optional[List[str]] = None,
) -> dict:
    """Analyze skill gaps for a target role and suggest learning paths."""
    skills_section = ""
    if current_skills:
        skills_section = f"\nCURRENT SKILLS: {', '.join(current_skills)}"
    if keywords_found:
        skills_section += f"\nSKILLS MATCHING THE ROLE (from ATS scan): {', '.join(keywords_found)}"
    if keywords_missing:
        skills_section += f"\nMISSING SKILLS FOR THE ROLE (from ATS scan): {', '.join(keywords_missing)}"

    prompt = f"""Analyze the skill gap for a student targeting the "{target_role}" role.
{skills_section}

Return valid JSON:
{{
  "match_percentage": <number 0-100>,
  "skill_categories": [
    {{
      "category": "<e.g., Programming Languages>",
      "current_score": <0-100>,
      "target_score": <0-100>,
      "skills_have": ["<skill 1>", ...],
      "skills_need": ["<skill 1>", ...],
      "priority": "<critical|important|nice_to_have>"
    }}
  ],
  "learning_path": [
    {{
      "skill": "<skill name>",
      "priority": "<critical|important|nice_to_have>",
      "estimated_weeks": <number>,
      "resources": [
        {{
          "title": "<course/resource name>",
          "platform": "<Coursera|YouTube|LeetCode|FreeCodeCamp|Udemy|Documentation>",
          "type": "<course|video|practice|documentation>",
          "free": true,
          "url": "<actual URL if known, otherwise '#'>"
        }}
      ]
    }}
  ],
  "radar_data": [
    {{"label": "<category>", "current": <0-100>, "required": <0-100>}}
  ],
  "summary": "<2-3 sentence assessment of readiness and key focus areas>"
}}

Guidelines:
- Prioritize FREE resources (YouTube, FreeCodeCamp, official docs) over paid
- Be realistic about time estimates
- Focus on the most impactful skills first
- Limit to top 6-8 skill categories for the radar chart
- Learning path should have max 8 items, sorted by priority

Return ONLY valid JSON."""

    messages = [
        {"role": "system", "content": "You are a career advisor who creates actionable learning plans. Return only valid JSON."},
        {"role": "user", "content": prompt},
    ]

    raw = await call_llm(messages, json_mode=True, temperature=0.2)
    return parse_json(raw) or {"error": "Could not analyze skill gaps. Please try again."}


async def generate_hr_questions(
    target_role: str,
    question_count: int = 7,
    company: Optional[str] = None,
    difficulty: str = "intermediate",
) -> dict:
    """Generate HR/behavioral interview questions with model STAR answers."""
    company_section = f' at {company}' if company else ''

    prompt = f"""Generate {question_count} HR/behavioral interview questions for a {target_role} candidate{company_section}.
Difficulty: {difficulty}

Return valid JSON:
{{
  "questions": [
    {{
      "question": "<the interview question>",
      "category": "<tell_me_about_yourself|strengths_weaknesses|conflict_resolution|leadership|teamwork|problem_solving|motivation|situational>",
      "difficulty": "<easy|medium|hard>",
      "model_answer": {{
        "situation": "<STAR: set the scene, 1-2 sentences>",
        "task": "<STAR: what was your role/responsibility, 1 sentence>",
        "action": "<STAR: specific steps you took, 2-3 sentences>",
        "result": "<STAR: quantified outcome, 1-2 sentences>"
      }},
      "tips": [
        "<specific tip for answering this type of question>",
        "<common mistake to avoid>"
      ],
      "follow_up_questions": ["<likely follow-up>", "<likely follow-up>"]
    }}
  ],
  "general_tips": [
    "<general HR interview tip 1>",
    "<general HR interview tip 2>",
    "<general HR interview tip 3>"
  ]
}}

Rules:
- Mix question categories — don't repeat the same type
- Model answers should relate to projects/internships a college student would have
- Include at least one "Tell me about yourself" variant
- Include at least one situational/hypothetical question
- Tips should be specific, not generic
- Make follow-up questions realistic (what interviewers actually ask)

Return ONLY valid JSON."""

    messages = [
        {"role": "system", "content": "You are an experienced HR interviewer who helps students prepare. Return only valid JSON."},
        {"role": "user", "content": prompt},
    ]

    raw = await call_llm(messages, json_mode=True, temperature=0.4)
    return parse_json(raw) or {"error": "Could not generate questions. Please try again."}


async def recommend_dsa_problems(
    count: int = 10,
    target_company: Optional[str] = None,
    difficulty: str = "medium",
    focus_area: Optional[str] = None,
) -> dict:
    """Recommend curated DSA problems based on target company and difficulty."""
    company_section = f' commonly asked at {target_company}' if target_company else ''
    focus_section = f'\nFocus area: {focus_area}' if focus_area else ''

    prompt = f"""Recommend {count} Data Structures & Algorithms problems{company_section}.
Difficulty preference: {difficulty}{focus_section}

Return valid JSON:
{{
  "problems": [
    {{
      "title": "<problem name>",
      "pattern": "<sliding_window|two_pointers|binary_search|dfs_bfs|dynamic_programming|greedy|stack_queue|linked_list|tree|graph|sorting|hashing|string|math|backtracking>",
      "difficulty": "<Easy|Medium|Hard>",
      "companies_asked": ["<company1>", "<company2>"],
      "leetcode_number": <number or null>,
      "approach_hint": "<1-2 sentence hint without giving the full solution>",
      "time_complexity": "<expected optimal time complexity>",
      "key_concept": "<the core concept being tested>"
    }}
  ],
  "pattern_distribution": [
    {{"pattern": "<pattern name>", "count": <number>, "importance": "<must_know|important|good_to_know>"}}
  ],
  "study_order": "<recommended order to solve these problems>",
  "tips": [
    "<general DSA interview tip>",
    "<general DSA interview tip>",
    "<general DSA interview tip>"
  ]
}}

Rules:
- Use REAL, well-known LeetCode problems that actually exist
- Include a mix of patterns unless a focus area is specified
- For company-specific: prioritize patterns that company is known to ask
- Sort by recommended solving order (easier concepts first)
- Each problem should test a different concept where possible
- LeetCode numbers should be accurate if you know them, otherwise null

Return ONLY valid JSON."""

    messages = [
        {"role": "system", "content": "You are a DSA coach who has trained thousands of students for tech interviews. Return only valid JSON."},
        {"role": "user", "content": prompt},
    ]

    raw = await call_llm(messages, json_mode=True, temperature=0.3)
    return parse_json(raw) or {"error": "Could not generate recommendations. Please try again."}


async def explore_career_paths(
    current_skills: Optional[List[str]] = None,
    target_role: Optional[str] = None,
    interests: Optional[str] = None,
) -> dict:
    """Explore career paths based on current skills and interests."""
    skills_section = f'CURRENT SKILLS: {", ".join(current_skills)}' if current_skills else ''
    target_section = f'INTERESTED IN: {target_role}' if target_role else ''
    interest_section = f'INTERESTS: {interests}' if interests else ''

    prompt = f"""Suggest 5-6 career paths for a B.Tech/engineering student.
{skills_section}
{target_section}
{interest_section}

Return valid JSON:
{{
  "paths": [
    {{
      "role": "<job title>",
      "match_percentage": <0-100>,
      "category": "<software|data|devops|product|design|security|cloud>",
      "avg_salary_inr": "<e.g., 6-12 LPA>",
      "demand": "<high|medium|low>",
      "growth_outlook": "<description of career growth in 5 years>",
      "required_skills": ["<skill 1>", "<skill 2>", ...],
      "skills_you_have": ["<from candidate's skills that match>"],
      "skills_to_learn": ["<gaps to fill>"],
      "typical_companies": ["<company 1>", "<company 2>", "<company 3>"],
      "entry_path": "<description of how to break into this role as a fresher>"
    }}
  ],
  "recommendation": "<1-2 sentence personalized recommendation based on the student's profile>"
}}

Rules:
- Salary ranges should be realistic for Indian freshers (2024-2025 market)
- Include a mix of common and emerging roles
- If skills are provided, sort by match_percentage (highest first)
- Be honest about demand — don't oversell niche roles
- Entry paths should be actionable (not just "learn X")
- Include at least one non-traditional/emerging role (e.g., MLOps, Platform Engineer, Developer Advocate)

Return ONLY valid JSON."""

    messages = [
        {"role": "system", "content": "You are a career counselor specializing in tech careers in India. Return only valid JSON."},
        {"role": "user", "content": prompt},
    ]

    raw = await call_llm(messages, json_mode=True, temperature=0.3)
    return parse_json(raw) or {"error": "Could not explore career paths. Please try again."}


# ═══════════════════════════════════════════════════════════════════════════════
# Static Data
# ═══════════════════════════════════════════════════════════════════════════════

RESUME_TEMPLATES = [
    {"id": "classic", "label": "Classic ATS", "category": "ats", "ats_safety": 98, "description": "Traditional single-column academic resume for broad campus drives.", "supported_sections": ["summary", "education", "skills", "projects", "experience", "certifications", "achievements"]},
    {"id": "modern", "label": "Modern Professional", "category": "premium", "ats_safety": 92, "description": "Polished fresher profile with a strong summary and project-first visual hierarchy.", "supported_sections": ["summary", "skills", "projects", "experience", "education", "certifications", "achievements"]},
    {"id": "compact", "label": "Compact One Page", "category": "ats", "ats_safety": 96, "description": "Dense one-page layout for students with several projects and certifications.", "supported_sections": ["education", "skills", "projects", "experience", "certifications", "achievements"]},
    {"id": "campus", "label": "Campus Placement", "category": "campus", "ats_safety": 94, "description": "Optimized for mass recruiters, eligibility checks, and quick TPO screening.", "supported_sections": ["summary", "education", "skills", "projects", "certifications", "achievements"]},
    {"id": "developer", "label": "Developer", "category": "technical", "ats_safety": 93, "description": "Project and tech-stack heavy template for software roles.", "supported_sections": ["summary", "skills", "projects", "experience", "education", "certifications", "achievements"]},
    {"id": "core-engineering", "label": "Core Engineering", "category": "technical", "ats_safety": 93, "description": "Lab, design, simulation, and domain-project oriented template for core branches.", "supported_sections": ["summary", "education", "skills", "projects", "experience", "certifications", "achievements"]},
    {"id": "management", "label": "Management", "category": "business", "ats_safety": 90, "description": "Leadership, operations, internship, and communication-focused template.", "supported_sections": ["summary", "experience", "projects", "education", "skills", "achievements", "certifications"]},
    {"id": "ats-strict", "label": "ATS Strict", "category": "ats", "ats_safety": 100, "description": "Maximum parser compatibility: single column, standard headings, no visual decoration.", "supported_sections": ["summary", "education", "skills", "projects", "experience", "certifications", "achievements"]},
]

COMPANY_INTEL = [
    {
        "name": "TCS",
        "logo_color": "#2B6CB0",
        "category": "IT Services",
        "avg_package_lpa": "3.5 - 7",
        "dream_package_lpa": "9 - 11 (Digital)",
        "interview_rounds": ["Aptitude Test (TCS NQT)", "Technical Interview", "Managerial Interview", "HR Interview"],
        "difficulty": "moderate",
        "preparation_time_weeks": 4,
        "key_topics": ["Aptitude & Reasoning", "Basic DSA", "DBMS", "Computer Networks", "OOP Concepts", "Java/Python Basics"],
        "tips": [
            "TCS NQT score is crucial — practice on their official platform",
            "Focus on coding efficiency, they value clean code",
            "Prepare HR answers well, TCS values cultural fit",
            "Digital profile requires stronger coding skills — LeetCode Easy/Medium"
        ],
        "past_questions": ["Reverse a linked list", "SQL joins query", "Explain OOP pillars", "Why TCS?", "Where do you see yourself in 5 years?"],
        "selection_rate": "~40% of eligible",
    },
    {
        "name": "Infosys",
        "logo_color": "#0066CC",
        "category": "IT Services",
        "avg_package_lpa": "3.6 - 6.5",
        "dream_package_lpa": "8 - 9.5 (Power Programmer/DSE)",
        "interview_rounds": ["InfyTQ / Online Assessment", "Technical Interview", "HR Interview"],
        "difficulty": "moderate",
        "preparation_time_weeks": 4,
        "key_topics": ["Aptitude", "SQL", "Java/Python", "OOP", "Basic DSA", "Pseudo Code"],
        "tips": [
            "InfyTQ certification can give you a direct interview call",
            "Practice pseudo code — Infosys uses their own format",
            "DSE role requires HackerRank-level coding skills",
            "Don't skip soft skills — Infosys values communication"
        ],
        "past_questions": ["Fibonacci series", "SQL group by query", "What is normalization?", "Tell me about a challenging project"],
        "selection_rate": "~35% of eligible",
    },
    {
        "name": "Wipro",
        "logo_color": "#7C3AED",
        "category": "IT Services",
        "avg_package_lpa": "3.5 - 6",
        "dream_package_lpa": "7.5 - 9 (WILP/Turbo)",
        "interview_rounds": ["Online Assessment", "Technical Interview", "HR Interview"],
        "difficulty": "easy-moderate",
        "preparation_time_weeks": 3,
        "key_topics": ["Aptitude", "English Communication", "Basic Programming", "DBMS Basics", "Networking Basics"],
        "tips": [
            "Wipro's aptitude is slightly easier than TCS/Infosys",
            "Focus on communication skills — Wipro weighs them heavily",
            "WILP program has a separate, harder assessment",
            "Prepare well for 'tell me about yourself' — it's heavily weighted"
        ],
        "past_questions": ["Array sorting", "Explain SDLC", "What is cloud computing?", "Why do you want to join Wipro?"],
        "selection_rate": "~45% of eligible",
    },
    {
        "name": "Cognizant",
        "logo_color": "#1A365D",
        "category": "IT Services",
        "avg_package_lpa": "4 - 7",
        "dream_package_lpa": "8.5 - 11 (GenC Next/Elevate)",
        "interview_rounds": ["AMCAT/CoCubes Assessment", "Technical Interview", "HR Interview"],
        "difficulty": "moderate",
        "preparation_time_weeks": 4,
        "key_topics": ["Automata (coding)", "SQL", "Java/Python", "OS Concepts", "Agile Methodology"],
        "tips": [
            "GenC Elevate role has a higher bar — practice Medium-level coding",
            "Cognizant's automata section is unique — practice on mock platforms",
            "They ask about latest tech trends — stay updated",
            "Project discussion is thorough — know every line of your project"
        ],
        "past_questions": ["Pattern printing", "SQL subqueries", "What is Agile?", "Describe your final year project"],
        "selection_rate": "~35% of eligible",
    },
    {
        "name": "Accenture",
        "logo_color": "#A855F7",
        "category": "IT Consulting",
        "avg_package_lpa": "4.5 - 6.5",
        "dream_package_lpa": "8 - 12 (Advanced SE)",
        "interview_rounds": ["Cognitive Assessment", "Coding Assessment", "Communication Assessment"],
        "difficulty": "moderate",
        "preparation_time_weeks": 3,
        "key_topics": ["Logical Reasoning", "English Proficiency", "Basic Coding", "Abstract Reasoning", "MS Office"],
        "tips": [
            "Communication assessment is a deal-breaker — practice spoken English",
            "Cognitive assessment is time-pressured — speed matters",
            "Coding section is relatively easier than other companies",
            "Advanced SE role requires separate, harder assessment"
        ],
        "past_questions": ["Number patterns", "Logical puzzles", "Email writing", "Coding: find second largest"],
        "selection_rate": "~50% of eligible",
    },
    {
        "name": "HCLTech",
        "logo_color": "#006BC7",
        "category": "IT Services",
        "avg_package_lpa": "3.5 - 6",
        "dream_package_lpa": "7 - 8.5",
        "interview_rounds": ["Online Test", "Technical Interview", "TR + HR Combined"],
        "difficulty": "easy-moderate",
        "preparation_time_weeks": 3,
        "key_topics": ["C/C++", "OS", "DBMS", "Networking", "aptitude"],
        "tips": [
            "HCL focuses heavily on C/C++ — brush up on pointers and memory",
            "Networking questions are common — learn OSI model, TCP/IP",
            "The combined TR+HR round means be prepared for both simultaneously",
            "They value willingness to learn over current skill level"
        ],
        "past_questions": ["Pointer arithmetic in C", "Explain TCP vs UDP", "What is indexing in DBMS?", "Are you okay with relocation?"],
        "selection_rate": "~40% of eligible",
    },
    {
        "name": "Tech Mahindra",
        "logo_color": "#E53E3E",
        "category": "IT Services",
        "avg_package_lpa": "3.25 - 5.5",
        "dream_package_lpa": "6.5 - 8",
        "interview_rounds": ["Online Assessment", "Group Discussion", "Technical Interview", "HR Interview"],
        "difficulty": "moderate",
        "preparation_time_weeks": 3,
        "key_topics": ["Aptitude", "GD Topics", "Telecom Basics", "Java/Python", "Current Affairs"],
        "tips": [
            "Group Discussion is a distinctive round — practice articulating opinions",
            "Telecom domain questions come up — learn basics (5G, IoT)",
            "They ask about current affairs and technology trends",
            "Dress formally for the GD — first impressions matter"
        ],
        "past_questions": ["GD: AI replacing jobs", "What is 5G?", "Write a program for palindrome", "Why Tech Mahindra?"],
        "selection_rate": "~35% of eligible",
    },
    {
        "name": "Google",
        "logo_color": "#4285F4",
        "category": "Product/Tech",
        "avg_package_lpa": "25 - 40 (SDE-1)",
        "dream_package_lpa": "40 - 55 (with stock)",
        "interview_rounds": ["Online Coding (2-3 rounds)", "Phone Screen", "On-site (4-5 rounds: Coding + System Design + Behavioral)"],
        "difficulty": "very hard",
        "preparation_time_weeks": 16,
        "key_topics": ["Advanced DSA", "System Design", "Graph Theory", "Dynamic Programming", "Problem Decomposition", "Googleyness"],
        "tips": [
            "Aim for 300+ LeetCode problems, focus on Medium/Hard",
            "System Design is crucial even for SDE-1 — study Grokking System Design",
            "Google values 'Googleyness' — collaborative, humble, growth mindset",
            "Practice thinking aloud — interviewers evaluate your thought process",
            "Mock interviews are essential — use Pramp or Interviewing.io"
        ],
        "past_questions": ["LRU Cache", "Merge K sorted lists", "Design Google Docs", "Tell me about a time you disagreed with a teammate"],
        "selection_rate": "~0.2% of applicants",
    },
    {
        "name": "Amazon",
        "logo_color": "#FF9900",
        "category": "Product/Tech",
        "avg_package_lpa": "20 - 35 (SDE-1)",
        "dream_package_lpa": "35 - 50 (with signing bonus)",
        "interview_rounds": ["Online Assessment (2 coding + Work Simulation)", "Phone Screen", "On-site (4 rounds: Coding + System Design + Leadership Principles)"],
        "difficulty": "very hard",
        "preparation_time_weeks": 14,
        "key_topics": ["DSA", "System Design", "Amazon Leadership Principles", "OOP Design", "Behavioral (LP-based)"],
        "tips": [
            "MEMORIZE the 16 Leadership Principles — every behavioral answer must map to them",
            "Amazon's bar raiser round is unpredictable — prepare broadly",
            "Practice OOP design: design a parking lot, design an elevator system",
            "Online Assessment is the first filter — practice on LeetCode (Medium/Hard)",
            "Have 2-3 STAR stories for each Leadership Principle"
        ],
        "past_questions": ["Two Sum", "Design a URL shortener", "Tell me about a time you went above and beyond (LP: Deliver Results)", "Find the kth largest element"],
        "selection_rate": "~0.5% of applicants",
    },
    {
        "name": "Microsoft",
        "logo_color": "#00A4EF",
        "category": "Product/Tech",
        "avg_package_lpa": "20 - 38 (SDE-1)",
        "dream_package_lpa": "38 - 48 (with benefits)",
        "interview_rounds": ["Online Coding Assessment", "Group Fly Round", "3-4 Technical Interviews", "Hiring Manager Round"],
        "difficulty": "hard",
        "preparation_time_weeks": 12,
        "key_topics": ["DSA", "OS Internals", "System Design", "Problem Solving", "C++/Java/C# deep dive"],
        "tips": [
            "Microsoft values clean, production-quality code — focus on readability",
            "Group fly round is unique: solve problems collaboratively on a whiteboard",
            "OS questions are common — study processes, threads, deadlocks, memory management",
            "They ask about your projects deeply — be prepared to explain design decisions",
            "Microsoft cares about growth mindset — show curiosity and learning ability"
        ],
        "past_questions": ["Implement a stack using queues", "Design an autocomplete system", "Explain deadlock with a real example", "What would you improve about Microsoft Teams?"],
        "selection_rate": "~1% of applicants",
    },
    {
        "name": "Deloitte",
        "logo_color": "#86BC25",
        "category": "Consulting",
        "avg_package_lpa": "6 - 10",
        "dream_package_lpa": "11 - 14 (USI)",
        "interview_rounds": ["Online Assessment", "Group Discussion", "Technical Interview", "HR/Partner Interview"],
        "difficulty": "moderate",
        "preparation_time_weeks": 5,
        "key_topics": ["Case Studies", "SQL/Excel", "Business Analysis", "Communication", "Technology Consulting"],
        "tips": [
            "Deloitte values consulting mindset — practice case study frameworks",
            "Communication skills are paramount — practice structured responses",
            "Be ready to discuss technology's impact on business",
            "USI (US India) roles have a higher bar and better compensation"
        ],
        "past_questions": ["Case study: optimize supply chain", "SQL aggregation query", "What is digital transformation?", "Describe a time you led a team"],
        "selection_rate": "~25% of eligible",
    },
    {
        "name": "Capgemini",
        "logo_color": "#0070AD",
        "category": "IT Consulting",
        "avg_package_lpa": "3.8 - 6",
        "dream_package_lpa": "7 - 9.5 (Analyst role)",
        "interview_rounds": ["Game-based Assessment", "Technical MCQ", "Coding Round", "Behavioral Interview"],
        "difficulty": "easy-moderate",
        "preparation_time_weeks": 3,
        "key_topics": ["Behavioral Assessment", "Basic Coding", "English Communication", "Logical Reasoning", "Personality Traits"],
        "tips": [
            "Capgemini's game-based assessment is unique — it tests personality traits, not knowledge",
            "Be consistent in your game choices — they detect contradictions",
            "Technical MCQs cover a wide range but are not very deep",
            "Behavioral interview focuses on teamwork and adaptability"
        ],
        "past_questions": ["Pattern matching", "Simple coding: triangle pattern", "What makes you a good team player?", "How do you handle pressure?"],
        "selection_rate": "~45% of eligible",
    },
]


def get_resume_templates() -> dict:
    """Return resume template metadata used by the Resume Studio UI."""
    return {"templates": RESUME_TEMPLATES}


def get_company_intel(
    branch: Optional[str] = None,
    role: Optional[str] = None,
    difficulty: Optional[str] = None,
    package_band: Optional[str] = None,
) -> dict:
    """Get upgraded company intel cards for common campus recruiters."""
    companies = [_upgrade_company_intel(c) for c in COMPANY_INTEL]

    if difficulty:
        d = difficulty.lower()
        companies = [c for c in companies if d in str(c.get("difficulty", "")).lower()]
    if role:
        r = role.lower()
        companies = [
            c for c in companies
            if any(r in item.lower() for item in c.get("roles", []))
            or any(r in topic.lower() for topic in c.get("key_topics", []))
        ]
    if branch:
        b = branch.upper()
        companies = [c for c in companies if b in c.get("branch_playbooks", {}) or "ALL" in c.get("branch_playbooks", {})]
    if package_band:
        band = package_band.lower()
        if band == "dream":
            companies = [c for c in companies if c.get("dream_package_lpa")]
        elif band == "mass":
            companies = [c for c in companies if c.get("category") in ("IT Services", "IT Consulting")]

    return {
        "companies": companies,
        "filters": {
            "branches": ["CSE", "ECE", "EEE", "CIVIL", "MECH", "ALL"],
            "roles": sorted({r for c in companies for r in c.get("roles", [])}),
            "difficulties": sorted({c.get("difficulty") for c in companies if c.get("difficulty")}),
            "package_bands": ["mass", "dream"],
        },
    }


def _upgrade_company_intel(company: dict) -> dict:
    roles = company.get("roles") or ["Graduate Engineer Trainee", "Software Engineer", "Analyst"]
    key_topics = company.get("key_topics", [])
    return {
        **company,
        "roles": roles,
        "eligibility": company.get("eligibility") or {
            "cgpa": "6.0+ preferred",
            "backlogs": "No active backlogs preferred",
            "branches": ["CSE", "ECE", "EEE", "MECH", "CIVIL"],
        },
        "round_strategy": [
            {"round": r, "what_to_prepare": _round_tip(r, key_topics)}
            for r in company.get("interview_rounds", [])
        ],
        "branch_playbooks": company.get("branch_playbooks") or {
            "CSE": ["DSA basics", "OOP", "DBMS", "project deep dive"],
            "ECE": ["core electronics basics", "C/Python fundamentals", "communication systems project explanation"],
            "EEE": ["electrical machines basics", "power systems fundamentals", "PLC/automation awareness"],
            "MECH": ["manufacturing basics", "thermodynamics fundamentals", "CAD/project explanation"],
            "CIVIL": ["surveying/materials basics", "structural fundamentals", "estimation/project explanation"],
            "ALL": key_topics[:4],
        },
        "common_rejection_reasons": company.get("common_rejection_reasons") or [
            "Weak explanation of resume projects",
            "Slow aptitude or coding accuracy under time pressure",
            "Generic HR answers without concrete examples",
        ],
        "preparation_plan": company.get("preparation_plan") or [
            {"week": 1, "focus": "Aptitude speed, resume cleanup, company overview"},
            {"week": 2, "focus": "Core technical topics and two mock interviews"},
            {"week": 3, "focus": "Past questions, HR stories, communication polish"},
        ],
    }


def _round_tip(round_name: str, key_topics: List[str]) -> str:
    name = round_name.lower()
    if "aptitude" in name or "assessment" in name:
        return "Practice timed aptitude, reasoning, English, and the company's known test pattern."
    if "technical" in name or "coding" in name:
        return "Revise core subjects, projects, coding basics, and be ready to explain tradeoffs."
    if "hr" in name or "managerial" in name:
        return "Prepare STAR stories, salary/location flexibility, and why-this-company answers."
    return ", ".join(key_topics[:3]) if key_topics else "Prepare role-specific fundamentals and resume discussion."
