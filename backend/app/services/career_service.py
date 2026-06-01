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
        # ── New enriched fields ──
        "description": "Tata Consultancy Services is India's largest IT services company and a global leader in consulting, technology, and digital transformation.",
        "headquarters": "Mumbai, India",
        "founded": 1968,
        "employee_count": "600,000+",
        "website": "https://www.tcs.com",
        "glassdoor_rating": 3.8,
        "work_culture": "Structured corporate culture with emphasis on process discipline and long-term career growth. Known for stability and employee welfare programs.",
        "roles_offered": [
            {
                "title": "Systems Engineer (Ninja)",
                "package_lpa": "3.36",
                "description": "Entry-level development, testing, and maintenance of enterprise applications across various technology stacks.",
                "skills_required": ["Java", "SQL", "DBMS", "OOP", "Python"],
                "growth_path": "Systems Engineer → IT Analyst → Senior Developer → Module Lead",
            },
            {
                "title": "Systems Engineer (Digital)",
                "package_lpa": "7 - 7.5",
                "description": "Work on digital transformation projects involving cloud, AI/ML, full-stack development, and DevOps.",
                "skills_required": ["Advanced DSA", "Full-Stack Development", "Cloud Basics", "Python/Java", "React/Angular"],
                "growth_path": "Digital SE → Digital Specialist → Lead Developer → Architect",
            },
            {
                "title": "Systems Engineer (Prime)",
                "package_lpa": "9 - 11",
                "description": "Premium role for top performers working on cutting-edge projects in AI, blockchain, IoT, and product engineering.",
                "skills_required": ["Strong DSA", "System Design Basics", "Cloud (AWS/Azure)", "AI/ML Basics", "Competitive Coding"],
                "growth_path": "Prime SE → Digital Specialist → Solution Architect → Technology Lead",
            },
        ],
        "past_questions_categorized": {
            "aptitude": [
                "A train 200m long passes a pole in 20 seconds. What is the speed?",
                "If 6 workers can complete a task in 12 days, how many days for 9 workers?",
                "Find the next term: 2, 6, 12, 20, 30, ?",
                "A sum of ₹5000 becomes ₹5500 in 2 years. Find the rate of simple interest.",
            ],
            "coding": [
                "Reverse a linked list",
                "Find the second largest number in an array without sorting",
                "Check if a string is a palindrome",
                "Write a program to find GCD of two numbers",
                "Implement binary search",
            ],
            "technical": [
                "Explain the four pillars of OOP with examples",
                "What is normalization? Explain 1NF, 2NF, 3NF",
                "Difference between TCP and UDP",
                "What is the difference between process and thread?",
                "Explain SQL joins with examples",
            ],
            "hr": [
                "Why TCS?",
                "Where do you see yourself in 5 years?",
                "Are you comfortable with relocation?",
                "Tell me about yourself",
                "What do you know about TCS's recent projects?",
            ],
        },
        "bond": {
            "duration": "1 year",
            "penalty": "₹1,00,000",
            "details": "Service agreement of 1 year from date of joining. Penalty amount is deducted or must be paid if employee leaves before completing the bond period.",
        },
        "training": {
            "duration": "2-3 months",
            "location": "Trivandrum (ILP — Initial Learning Program) / Chennai / Kolkata",
            "stipend": "Full salary during training",
            "details": "TCS ILP (Initial Learning Program) covers Java, SQL, UNIX, Agile, and soft skills at their Trivandrum campus. Trainees are assessed continuously; those failing assessments may face delays in project allocation.",
        },
        "work_locations": ["Mumbai", "Chennai", "Hyderabad", "Pune", "Bangalore", "Kolkata", "Noida", "Kochi"],
        "tech_stack": ["Java", "Spring Boot", ".NET", "Python", "SAP", "Cloud (AWS/Azure)", "React", "Angular", "Microservices", "Salesforce"],
        "wfh_policy": "Hybrid — 3 days office, 2 days WFH (varies by project and client requirements)",
        "career_growth": [
            {"years": "0-2", "role": "Systems Engineer", "salary_range": "3.36 - 5 LPA"},
            {"years": "2-5", "role": "IT Analyst", "salary_range": "5.5 - 9 LPA"},
            {"years": "5-8", "role": "Senior Developer / Module Lead", "salary_range": "10 - 16 LPA"},
            {"years": "8-12", "role": "Architect / Delivery Manager", "salary_range": "18 - 28 LPA"},
        ],
        "benefits": ["Health Insurance (self + family)", "Cab Facility", "Food Subsidy", "Relocation Allowance", "TCS iON Learning Platform", "Employee Stock Purchase Plan", "Gratuity"],
        "bench_risk": "Low — typically staffed within 2-4 weeks after ILP training. Bench periods rarely exceed 1 month.",
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
        # ── New enriched fields ──
        "description": "Infosys is a global IT services and consulting giant, known for its Mysore training campus and pioneering the Indian IT outsourcing industry.",
        "headquarters": "Bangalore, India",
        "founded": 1981,
        "employee_count": "320,000+",
        "website": "https://www.infosys.com",
        "glassdoor_rating": 3.7,
        "work_culture": "Professional, process-driven culture with strong emphasis on learning and certifications. Known for the iconic Mysore campus and structured onboarding.",
        "roles_offered": [
            {
                "title": "Systems Engineer (SE)",
                "package_lpa": "3.6",
                "description": "Entry-level role involving application development, maintenance, testing, and support across client projects.",
                "skills_required": ["Java", "Python", "SQL", "OOP", "Basic DSA"],
                "growth_path": "Systems Engineer → Senior SE → Technology Analyst → Technology Lead",
            },
            {
                "title": "Digital Specialist Engineer (DSE)",
                "package_lpa": "6.25 - 6.5",
                "description": "Higher-tier role focused on digital technologies — full-stack development, cloud, data engineering, and automation.",
                "skills_required": ["Advanced Programming", "Full-Stack", "Cloud (AWS/Azure)", "DSA", "DBMS"],
                "growth_path": "DSE → Senior DSE → Digital Specialist Lead → Architect",
            },
            {
                "title": "Power Programmer (PP)",
                "package_lpa": "8 - 9.5",
                "description": "Top-tier fresher role for exceptional coders. Work on product engineering, open source, and R&D initiatives.",
                "skills_required": ["Advanced DSA", "System Design", "Competitive Programming", "Open Source Contributions", "Multiple Languages"],
                "growth_path": "Power Programmer → Senior PP → Principal Engineer → Distinguished Engineer",
            },
        ],
        "past_questions_categorized": {
            "aptitude": [
                "A boat travels 20 km upstream in 5 hours. Find the speed of the stream.",
                "Complete the pattern: 1, 4, 9, 16, 25, ?",
                "Three pipes fill a tank in 6, 8, and 12 hours respectively. Find time when all three work together.",
                "Probability of getting a sum of 7 with two dice?",
            ],
            "coding": [
                "Generate Fibonacci series up to N terms",
                "Find duplicate elements in an array",
                "Implement stack using arrays",
                "Check if a number is Armstrong number",
                "Write pseudo code for sorting an array",
            ],
            "technical": [
                "What is normalization? Explain with examples up to BCNF",
                "Difference between abstract class and interface",
                "Explain polymorphism with a real-world example",
                "What is ACID property in databases?",
                "Difference between HashMap and HashTable in Java",
            ],
            "hr": [
                "Tell me about a challenging project you worked on",
                "Why Infosys over other IT companies?",
                "How do you handle pressure and deadlines?",
                "Are you willing to work in any technology?",
                "What motivates you?",
            ],
        },
        "bond": {
            "duration": "1 year",
            "penalty": "₹1,00,000",
            "details": "Service agreement bond of 1 year. Employees leaving before completion must pay the penalty amount. Bond period starts from date of joining, not from end of training.",
        },
        "training": {
            "duration": "3-5 months",
            "location": "Mysore (Infosys Global Education Centre)",
            "stipend": "Full salary during training",
            "details": "Training at the world-renowned Infosys Mysore campus. Covers Java, DBMS, UNIX, soft skills, and domain-specific modules. The campus features hostels, food courts, sports facilities, and a cinema. Assessment-based progression — low performers may be given additional training.",
        },
        "work_locations": ["Bangalore", "Hyderabad", "Pune", "Chennai", "Mysore", "Chandigarh", "Bhubaneswar", "Mangalore"],
        "tech_stack": ["Java", "Spring", "Python", "SAP", ".NET", "Angular", "React", "Oracle", "Cloud (AWS/Azure/GCP)", "ServiceNow"],
        "wfh_policy": "Hybrid — mostly 3 days office per week. Varies by client; some projects allow more remote flexibility.",
        "career_growth": [
            {"years": "0-2", "role": "Systems Engineer", "salary_range": "3.6 - 5 LPA"},
            {"years": "2-4", "role": "Senior Systems Engineer", "salary_range": "5.5 - 8 LPA"},
            {"years": "4-7", "role": "Technology Analyst", "salary_range": "8 - 14 LPA"},
            {"years": "7-10", "role": "Technology Lead / Architect", "salary_range": "15 - 25 LPA"},
        ],
        "benefits": ["Health Insurance (self + family + parents)", "Cab Facility", "Relocation Allowance", "Infosys Lex Learning Platform", "ESOPs (senior levels)", "Gratuity", "Meal Coupons"],
        "bench_risk": "Low — Infosys typically allocates projects within 1-3 weeks post-training. Bench risk is minimal for SE; slightly higher for DSE in niche domains.",
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
        # ── New enriched fields ──
        "description": "Wipro Limited is a leading Indian IT services company offering consulting, design, engineering, and operations services across technology and business domains.",
        "headquarters": "Bangalore, India",
        "founded": 1945,
        "employee_count": "240,000+",
        "website": "https://www.wipro.com",
        "glassdoor_rating": 3.6,
        "work_culture": "Collaborative and diverse culture. Known for its Spirit of Wipro values — intensity, acting as part of one team, and sensitivity. Good work-life balance relative to peers.",
        "roles_offered": [
            {
                "title": "Project Engineer",
                "package_lpa": "3.5",
                "description": "Entry-level development and support role working on client projects in application services, testing, or infrastructure management.",
                "skills_required": ["Java", "Python", "SQL", "Basic DSA", "Communication Skills"],
                "growth_path": "Project Engineer → Senior PE → Team Lead → Project Manager",
            },
            {
                "title": "Project Engineer (WILP)",
                "package_lpa": "6.5 - 7.5",
                "description": "Work Integrated Learning Programme — work full-time while pursuing an MTech/MBA from BITS Pilani. Higher package and structured career growth.",
                "skills_required": ["Intermediate DSA", "Java/Python", "DBMS", "OOP", "Analytical Skills"],
                "growth_path": "WILP PE → Senior Engineer → Lead → Architect (with MTech/MBA)",
            },
            {
                "title": "Project Engineer (Turbo)",
                "package_lpa": "7.5 - 9",
                "description": "Premium hire for high-performing candidates with strong coding and technical aptitude, placed on critical digital projects.",
                "skills_required": ["Strong DSA", "System Design Basics", "Full-Stack Basics", "Cloud Awareness", "Problem Solving"],
                "growth_path": "Turbo PE → Digital Specialist → Lead Developer → Architect",
            },
        ],
        "past_questions_categorized": {
            "aptitude": [
                "A cyclist covers 12 km in 40 minutes. Find the speed in km/hr.",
                "If the ratio of boys to girls is 3:5 and total students are 160, find boys.",
                "Find the odd one out: 2, 5, 10, 17, 28, 37",
                "A shopkeeper sells at 20% profit. Find the cost price if SP is ₹600.",
            ],
            "coding": [
                "Sort an array using bubble sort",
                "Find the largest and smallest element in an array",
                "Write a program to check if a number is prime",
                "Reverse a string without using built-in functions",
            ],
            "technical": [
                "Explain SDLC and its phases",
                "What is cloud computing? Name the service models.",
                "Difference between stack and queue",
                "What is a foreign key in DBMS?",
                "Explain the concept of virtual memory",
            ],
            "hr": [
                "Why do you want to join Wipro?",
                "Tell me about yourself",
                "Are you comfortable working in shifts?",
                "What are your strengths and weaknesses?",
                "How do you handle a disagreement with a colleague?",
            ],
        },
        "bond": {
            "duration": "1 year (WILP: 4 years)",
            "penalty": "₹75,000 (WILP: ₹2,00,000 - ₹3,00,000 pro-rata)",
            "details": "Standard hires have a 1-year bond. WILP hires have a 4-year service agreement since Wipro funds the MTech/MBA degree from BITS Pilani. WILP penalty is pro-rated based on remaining tenure.",
        },
        "training": {
            "duration": "1.5 - 2 months",
            "location": "Bangalore / Hyderabad / Greater Noida",
            "stipend": "Full salary during training",
            "details": "Wipro's training (TopGear program) covers technical skills in Java/.NET, soft skills, project methodology, and domain knowledge. Training is classroom + project-based with continuous assessments.",
        },
        "work_locations": ["Bangalore", "Hyderabad", "Chennai", "Pune", "Noida", "Kolkata", "Kochi"],
        "tech_stack": ["Java", ".NET", "Python", "SAP", "Salesforce", "Cloud (AWS/Azure)", "Angular", "React", "DevOps", "Oracle"],
        "wfh_policy": "Hybrid — 3 days office, 2 days WFH. Policies vary by client; some projects are fully on-site.",
        "career_growth": [
            {"years": "0-2", "role": "Project Engineer", "salary_range": "3.5 - 5 LPA"},
            {"years": "2-4", "role": "Senior Project Engineer", "salary_range": "5 - 8 LPA"},
            {"years": "4-7", "role": "Team Lead / Module Lead", "salary_range": "9 - 14 LPA"},
            {"years": "7-10", "role": "Project Manager / Architect", "salary_range": "15 - 22 LPA"},
        ],
        "benefits": ["Health Insurance", "Cab Facility", "Meal Allowance", "Relocation Allowance", "WILP Higher Education Sponsorship", "Employee Assistance Program", "Gratuity"],
        "bench_risk": "Moderate — bench periods of 2-6 weeks are common after training. Wipro actively redeploys bench resources but it can stretch during slowdowns.",
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
        # ── New enriched fields ──
        "description": "Cognizant is a US-headquartered multinational IT services company with major operations in India, specializing in digital engineering, AI, and cloud modernization.",
        "headquarters": "Teaneck, New Jersey, USA (India HQ: Chennai)",
        "founded": 1994,
        "employee_count": "350,000+",
        "website": "https://www.cognizant.com",
        "glassdoor_rating": 3.7,
        "work_culture": "Client-focused and fast-paced culture. US-headquartered so follows global corporate standards. Known for competitive compensation among mass recruiters and transparent appraisal cycles.",
        "roles_offered": [
            {
                "title": "GenC (Graduate Engineer)",
                "package_lpa": "4",
                "description": "Base-level role for freshers involving software development, testing, and application support for global clients.",
                "skills_required": ["Java/Python", "SQL", "OOP", "Basic DSA", "Communication"],
                "growth_path": "GenC → Programmer Analyst → Associate → Senior Associate",
            },
            {
                "title": "GenC Next",
                "package_lpa": "6.75 - 7",
                "description": "Mid-tier role for strong performers focused on full-stack development, cloud, and digital technologies.",
                "skills_required": ["Intermediate DSA", "Full-Stack Basics", "DBMS", "Cloud Awareness", "Java/Python"],
                "growth_path": "GenC Next → Programmer Analyst → Associate → Manager",
            },
            {
                "title": "GenC Elevate",
                "package_lpa": "9 - 11",
                "description": "Premium hire for top coders. Placed on high-impact digital projects in AI, data engineering, or product development.",
                "skills_required": ["Advanced DSA", "System Design Basics", "Cloud (AWS/Azure)", "Competitive Coding", "Full-Stack Development"],
                "growth_path": "GenC Elevate → Senior Programmer Analyst → Associate Director → Director",
            },
        ],
        "past_questions_categorized": {
            "aptitude": [
                "If A can do a piece of work in 10 days, B in 15 days, how long together?",
                "Find the missing term: 3, 7, 15, 31, ?",
                "A car travels 360 km in 6 hours. Find speed in m/s.",
                "Simplify: (2^3 × 4^2) / (8 × 2)",
            ],
            "coding": [
                "Print patterns: pyramid, diamond, number triangle",
                "Find the sum of digits of a number recursively",
                "Implement linear and binary search",
                "Write a program to check if two strings are anagrams",
                "SQL: Find employees with salary > average salary using subqueries",
            ],
            "technical": [
                "What is Agile methodology? Explain Scrum framework",
                "Difference between RDBMS and NoSQL databases",
                "Explain process scheduling algorithms (FCFS, SJF, Round Robin)",
                "What is multithreading? How is it different from multiprocessing?",
                "Describe your final year project in detail — architecture, challenges, and tech stack",
            ],
            "hr": [
                "Why Cognizant?",
                "Describe a time you worked in a team under pressure",
                "Are you open to relocation and working in any technology?",
                "What do you know about Cognizant's recent acquisitions?",
                "Where do you see yourself in 3 years?",
            ],
        },
        "bond": {
            "duration": "1 year (GenC Next/Elevate: 2 years)",
            "penalty": "₹1,00,000 (GenC Next/Elevate: ₹2,00,000)",
            "details": "Base GenC has a 1-year service agreement. Higher-tier hires (GenC Next and Elevate) have a 2-year bond with a higher penalty due to increased training investment.",
        },
        "training": {
            "duration": "2-3 months",
            "location": "Chennai (CTS Academy) / Coimbatore / Hyderabad",
            "stipend": "Full salary during training",
            "details": "Cognizant Academy training covers Java, .NET, Cloud basics, Agile, testing frameworks, and domain-specific modules. Training includes a capstone project and continuous evaluation.",
        },
        "work_locations": ["Chennai", "Hyderabad", "Bangalore", "Pune", "Kolkata", "Coimbatore", "Kochi", "Mumbai"],
        "tech_stack": ["Java", ".NET", "Python", "AWS", "Azure", "React", "Angular", "Pega", "Salesforce", "Hadoop", "Spark"],
        "wfh_policy": "Hybrid — 3 days in office mandated. Some projects offer flexible schedules based on client requirements.",
        "career_growth": [
            {"years": "0-2", "role": "Programmer Analyst Trainee → Programmer Analyst", "salary_range": "4 - 6 LPA"},
            {"years": "2-5", "role": "Associate", "salary_range": "7 - 11 LPA"},
            {"years": "5-8", "role": "Senior Associate / Manager", "salary_range": "12 - 18 LPA"},
            {"years": "8-12", "role": "Associate Director", "salary_range": "20 - 30 LPA"},
        ],
        "benefits": ["Health Insurance (self + dependents)", "Cab Facility", "Meal Card", "Relocation Allowance", "Cognizant Academy Learning", "Performance Bonus", "Gratuity"],
        "bench_risk": "Moderate — project allocation typically takes 2-4 weeks. During bench, employees undergo skill training; extended bench periods (2+ months) can occur during market slowdowns.",
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
        # ── New enriched fields ──
        "description": "Accenture is a global professional services company specializing in IT consulting, strategy, digital transformation, and managed services across all industries.",
        "headquarters": "Dublin, Ireland (India HQ: Mumbai/Bangalore)",
        "founded": 1989,
        "employee_count": "740,000+",
        "website": "https://www.accenture.com",
        "glassdoor_rating": 4.0,
        "work_culture": "Diverse, inclusive, and global culture. Strong focus on continuous learning, innovation, and client-facing work. Known for progressive policies on diversity and work-life balance.",
        "roles_offered": [
            {
                "title": "Associate Software Engineer (ASE)",
                "package_lpa": "4.5",
                "description": "Entry-level role involving application development, testing, and support. Primarily works on client-facing projects.",
                "skills_required": ["Basic Coding", "SQL", "Communication", "Logical Reasoning", "MS Office"],
                "growth_path": "ASE → Software Engineer → Senior SE → Team Lead → Manager",
            },
            {
                "title": "Advanced Associate Software Engineer",
                "package_lpa": "6.5 - 7",
                "description": "Mid-level fresher role for candidates with stronger technical aptitude. Works on digital, cloud, and automation projects.",
                "skills_required": ["Java/Python", "DBMS", "OOP", "Intermediate DSA", "Cloud Basics"],
                "growth_path": "Advanced ASE → Senior SE → Lead → Senior Manager",
            },
            {
                "title": "Advanced Software Engineer",
                "package_lpa": "11 - 12",
                "description": "Top-tier fresher role for exceptional coders. Directly placed on advanced technology projects in AI, cloud-native, and consulting.",
                "skills_required": ["Strong DSA", "Full-Stack Development", "Cloud (AWS/Azure/GCP)", "System Design Basics", "Leadership Skills"],
                "growth_path": "Advanced SE → Lead Developer → Manager → Senior Manager → Managing Director",
            },
        ],
        "past_questions_categorized": {
            "aptitude": [
                "If a clock shows 3:15, what angle do the hands make?",
                "Complete the series: B2, D4, F6, H8, ?",
                "A mixture of milk and water in ratio 4:1. How much water to add to make it 3:2?",
                "Find the number of triangles in a given figure (abstract reasoning)",
            ],
            "coding": [
                "Find the second largest element in an array",
                "Write a program to check if a number is a perfect number",
                "Implement a basic calculator using switch-case",
                "Count vowels and consonants in a string",
            ],
            "technical": [
                "What is a virtual function in C++?",
                "Explain the differences between GET and POST methods",
                "What is cloud computing? Name its deployment models.",
                "Explain the box model in CSS (for full-stack roles)",
            ],
            "hr": [
                "Write a professional email to a client about a project delay (communication assessment)",
                "Record a 1-minute introduction about yourself (video assessment)",
                "Why do you want to join Accenture?",
                "How do you handle multiple deadlines simultaneously?",
            ],
        },
        "bond": {
            "duration": "None (no formal bond)",
            "penalty": "N/A",
            "details": "Accenture does not enforce a service agreement or bond for freshers. However, there is an informal expectation to stay at least 1 year, and early exits may impact rehire eligibility.",
        },
        "training": {
            "duration": "1-2 months",
            "location": "Bangalore / Hyderabad / Pune (virtual + on-site)",
            "stipend": "Full salary during training",
            "details": "Accenture's onboarding includes a mix of virtual and in-person training covering technology foundations, client engagement skills, Accenture tools/processes, and domain-specific modules via their myLearning platform.",
        },
        "work_locations": ["Bangalore", "Hyderabad", "Mumbai", "Pune", "Chennai", "Gurgaon", "Kolkata", "Noida"],
        "tech_stack": ["Java", ".NET", "Python", "SAP", "Salesforce", "Cloud (AWS/Azure/GCP)", "ServiceNow", "Workday", "RPA (UiPath/Automation Anywhere)", "React/Angular"],
        "wfh_policy": "Hybrid — typically 3 days in office. Some projects are fully remote; flexibility depends on client and role.",
        "career_growth": [
            {"years": "0-2", "role": "Associate Software Engineer", "salary_range": "4.5 - 6 LPA"},
            {"years": "2-4", "role": "Software Engineer / Analyst", "salary_range": "6 - 10 LPA"},
            {"years": "4-7", "role": "Senior Analyst / Team Lead", "salary_range": "10 - 16 LPA"},
            {"years": "7-12", "role": "Manager / Senior Manager", "salary_range": "18 - 30 LPA"},
        ],
        "benefits": ["Health Insurance (comprehensive)", "Cab Facility", "Meal Card", "Relocation Allowance", "myLearning Platform (Udemy, Coursera access)", "Performance Bonus", "Employee Stock Purchase Plan", "Parental Leave"],
        "bench_risk": "Low — Accenture's large project portfolio ensures rapid staffing. Bench periods rarely exceed 2-3 weeks.",
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
        # ── New enriched fields ──
        "description": "HCLTech (formerly HCL Technologies) is a leading Indian IT company known for its engineering and R&D services, infrastructure management, and Mode 1-2-3 strategy.",
        "headquarters": "Noida, India",
        "founded": 1991,
        "employee_count": "220,000+",
        "website": "https://www.hcltech.com",
        "glassdoor_rating": 3.5,
        "work_culture": "Engineering-focused culture with a strong emphasis on R&D and infrastructure services. Employee-first philosophy with Ideapreneurship initiative. Decent work-life balance.",
        "roles_offered": [
            {
                "title": "Graduate Engineer Trainee (GET)",
                "package_lpa": "3.5 - 4",
                "description": "Entry-level role in application development, infrastructure management, or engineering services based on project allocation.",
                "skills_required": ["C/C++", "Java", "SQL", "OS Concepts", "Networking Basics"],
                "growth_path": "GET → Software Engineer → Lead Engineer → Project Manager",
            },
            {
                "title": "Associate Analyst (Tech Bee)",
                "package_lpa": "2 - 3",
                "description": "Early career program for diploma/12th pass candidates. Combines work with education sponsorship.",
                "skills_required": ["Basic Computer Skills", "English Communication", "Aptitude", "Willingness to Learn"],
                "growth_path": "Tech Bee → Analyst → Senior Analyst → Lead",
            },
            {
                "title": "Software Engineer (Lateral/Direct)",
                "package_lpa": "5 - 6.5",
                "description": "Direct hire for candidates with strong profiles in specific technology stacks or prior internship experience.",
                "skills_required": ["Java/.NET/Python", "DBMS", "Cloud Basics", "DSA", "OOP"],
                "growth_path": "SE → Senior SE → Lead → Architect",
            },
        ],
        "past_questions_categorized": {
            "aptitude": [
                "A person walks 6 km East, turns left, and walks 4 km. How far from start?",
                "If EARTH is coded as HDUWK, what is MOON?",
                "Find the LCM and HCF of 12 and 18",
                "A work can be done by 8 men in 10 days. How many men for 5 days?",
            ],
            "coding": [
                "Explain pointer arithmetic in C with examples",
                "Write a program to find factorial using recursion",
                "Implement a linked list with insert and delete operations",
                "Write a C program to swap two numbers without a third variable",
            ],
            "technical": [
                "Explain TCP vs UDP with use cases",
                "What is indexing in DBMS? Types of indexes?",
                "Explain the OSI model layers with functions",
                "What is deadlock? What are the conditions for deadlock?",
                "Difference between process and thread with diagrams",
            ],
            "hr": [
                "Are you okay with relocation to any city?",
                "Why HCLTech?",
                "What is your biggest achievement?",
                "Are you comfortable with night shifts?",
                "Tell me about your hobbies and how they help you professionally",
            ],
        },
        "bond": {
            "duration": "1 year",
            "penalty": "₹50,000 - ₹1,00,000",
            "details": "Service agreement of 1 year from date of joining. Penalty amount varies by role and offer letter. Tech Bee program has a longer bond period (2-3 years).",
        },
        "training": {
            "duration": "1.5 - 2 months",
            "location": "Noida / Madurai / Lucknow / Chennai",
            "stipend": "Full salary during training",
            "details": "HCLTech training covers technology fundamentals, HCL-specific tools and processes, soft skills, and domain knowledge. The program includes hands-on projects and regular assessments.",
        },
        "work_locations": ["Noida", "Chennai", "Bangalore", "Hyderabad", "Pune", "Lucknow", "Nagpur", "Madurai"],
        "tech_stack": ["C/C++", "Java", ".NET", "Python", "Cloud (AWS/Azure)", "SAP", "Networking (Cisco)", "DevOps", "Mainframes", "ServiceNow"],
        "wfh_policy": "Hybrid — 3 days office, 2 days WFH. Infrastructure/networking roles may require more on-site presence.",
        "career_growth": [
            {"years": "0-2", "role": "Graduate Engineer Trainee / Analyst", "salary_range": "3.5 - 5 LPA"},
            {"years": "2-5", "role": "Software Engineer / Senior Analyst", "salary_range": "5.5 - 9 LPA"},
            {"years": "5-8", "role": "Lead Engineer / Project Lead", "salary_range": "10 - 15 LPA"},
            {"years": "8-12", "role": "Project Manager / Architect", "salary_range": "16 - 24 LPA"},
        ],
        "benefits": ["Health Insurance", "Cab Facility", "Meal Subsidy", "Relocation Allowance", "HCL TalentCare Learning", "Performance Bonus", "Gratuity"],
        "bench_risk": "Moderate — bench periods of 2-6 weeks are possible, especially in infrastructure roles. Application development roles tend to get staffed faster.",
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
        # ── New enriched fields ──
        "description": "Tech Mahindra is a Mahindra Group company specializing in telecom, enterprise technology, and digital transformation services. Strong presence in 5G, IoT, and network services.",
        "headquarters": "Pune, India",
        "founded": 1986,
        "employee_count": "150,000+",
        "website": "https://www.techmahindra.com",
        "glassdoor_rating": 3.4,
        "work_culture": "Entrepreneurial and telecom-oriented culture with the Mahindra Group's Rise philosophy. Known for domain specialization in telecom and faster growth in niche areas.",
        "roles_offered": [
            {
                "title": "Associate Software Engineer",
                "package_lpa": "3.25 - 3.75",
                "description": "Entry-level development and testing role across telecom, enterprise, and BFSI verticals.",
                "skills_required": ["Java/Python", "SQL", "Aptitude", "Communication", "Basic DSA"],
                "growth_path": "Associate SE → Software Engineer → Senior SE → Lead → Manager",
            },
            {
                "title": "Software Engineer (Splunk/Digital)",
                "package_lpa": "5 - 6.5",
                "description": "Mid-tier role for candidates with stronger technical skills. Placed on digital transformation or telecom modernization projects.",
                "skills_required": ["Intermediate Coding", "DBMS", "Cloud Basics", "Networking", "Java/.NET"],
                "growth_path": "SE → Senior SE → Technical Lead → Architect",
            },
            {
                "title": "Senior Software Engineer",
                "package_lpa": "6.5 - 8",
                "description": "Premium fresher role for high-performing candidates with competitive coding or strong project portfolio.",
                "skills_required": ["Strong DSA", "System Design Basics", "Full-Stack Basics", "Telecom/5G Basics", "Cloud"],
                "growth_path": "Senior SE → Lead Developer → Delivery Lead → Practice Head",
            },
        ],
        "past_questions_categorized": {
            "aptitude": [
                "Two trains running in opposite directions cross each other in 10 seconds. Find the relative speed.",
                "Find the angle between the hour and minute hands at 7:20.",
                "If CLOUD is coded as DMPVE, what is STORM?",
                "A pipe fills a tank in 6 hours. Another drains it in 10 hours. When will the tank fill?",
            ],
            "coding": [
                "Write a program to check if a string is a palindrome",
                "Print Floyd's triangle",
                "Find prime numbers between 1 and 100",
                "Implement a simple calculator program",
            ],
            "technical": [
                "What is 5G? How is it different from 4G?",
                "Explain the MVC architecture",
                "What is IoT? Name some applications",
                "Difference between compiler and interpreter",
                "What is DNS and how does it work?",
            ],
            "hr": [
                "GD Topic: Should AI replace human jobs?",
                "GD Topic: Is social media boon or bane?",
                "Why Tech Mahindra?",
                "What do you know about the Mahindra Group?",
                "Are you okay with working in telecom domain?",
            ],
        },
        "bond": {
            "duration": "1 year",
            "penalty": "₹75,000 - ₹1,00,000",
            "details": "Service agreement of 1 year from date of joining. Penalty varies by offer letter. Leaving during training period results in immediate bond invocation.",
        },
        "training": {
            "duration": "1-2 months",
            "location": "Pune / Hyderabad / Noida",
            "stipend": "Full salary during training",
            "details": "Training covers core technology (Java/.NET), telecom domain fundamentals (for telecom vertical), soft skills, and project methodology. Includes a mini-project as part of evaluation.",
        },
        "work_locations": ["Pune", "Hyderabad", "Bangalore", "Chennai", "Noida", "Mumbai", "Kolkata", "Chandigarh"],
        "tech_stack": ["Java", ".NET", "Python", "SAP", "5G/Telecom", "Cloud (AWS/Azure)", "React", "Angular", "DevOps", "IoT"],
        "wfh_policy": "Hybrid — mostly 3 days office. Telecom/network operations roles may be fully on-site due to infrastructure requirements.",
        "career_growth": [
            {"years": "0-2", "role": "Associate Software Engineer", "salary_range": "3.25 - 4.5 LPA"},
            {"years": "2-5", "role": "Software Engineer", "salary_range": "5 - 8 LPA"},
            {"years": "5-8", "role": "Senior SE / Technical Lead", "salary_range": "9 - 14 LPA"},
            {"years": "8-12", "role": "Delivery Manager / Architect", "salary_range": "15 - 22 LPA"},
        ],
        "benefits": ["Health Insurance", "Cab Facility", "Meal Card", "Relocation Allowance", "Tech Mahindra Learning World", "Performance Bonus", "Gratuity"],
        "bench_risk": "Moderate to High — bench periods of 3-8 weeks are common. Telecom-specific roles may face longer bench during project transitions. Active internal training during bench.",
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
        # ── New enriched fields ──
        "description": "Google (Alphabet Inc.) is the world's leading technology company, dominating search, advertising, cloud computing, and building products used by billions globally.",
        "headquarters": "Mountain View, California, USA (India offices: Bangalore, Hyderabad, Gurgaon)",
        "founded": 1998,
        "employee_count": "180,000+",
        "website": "https://careers.google.com",
        "glassdoor_rating": 4.3,
        "work_culture": "Innovation-driven, flat hierarchy culture famous for 20% time, open communication, and world-class perks. Emphasizes psychological safety, data-driven decisions, and 'Googleyness'.",
        "roles_offered": [
            {
                "title": "Software Engineer L3 (SDE-1)",
                "package_lpa": "25 - 40",
                "description": "Entry-level engineering role building and maintaining Google-scale systems. Works on Search, Ads, Cloud, YouTube, Android, or internal infrastructure.",
                "skills_required": ["Advanced DSA", "System Design", "Python/Java/C++/Go", "Problem Solving", "Distributed Systems"],
                "growth_path": "L3 (SWE) → L4 (Senior SWE) → L5 (Staff) → L6 (Senior Staff) → L7+ (Principal/Fellow)",
            },
            {
                "title": "Software Engineer L3 (SDE-1, with stock refreshers)",
                "package_lpa": "40 - 55 (total comp with RSUs)",
                "description": "Same role as above but total compensation including annual stock refreshers, sign-on bonus, and performance bonuses for top offers.",
                "skills_required": ["Advanced DSA", "System Design", "Competitive Programming Background", "Strong CS Fundamentals"],
                "growth_path": "L3 → L4 → L5 → L6 → Distinguished Engineer / Fellow",
            },
            {
                "title": "STEP Intern / Student Developer",
                "package_lpa": "Stipend: ₹80,000 - ₹1,00,000/month",
                "description": "Summer internship for 2nd/3rd year students. Pre-final year interns with strong performance receive full-time return offers.",
                "skills_required": ["DSA", "Problem Solving", "Any Programming Language", "CS Fundamentals"],
                "growth_path": "STEP Intern → Return Offer → L3 SWE",
            },
        ],
        "past_questions_categorized": {
            "aptitude": [],
            "coding": [
                "Design and implement an LRU Cache (LeetCode 146)",
                "Merge K sorted linked lists (LeetCode 23)",
                "Trapping Rain Water (LeetCode 42)",
                "Word Ladder (LeetCode 127)",
                "Median of Two Sorted Arrays (LeetCode 4)",
                "Serialize and Deserialize Binary Tree (LeetCode 297)",
            ],
            "technical": [
                "Design Google Docs — real-time collaborative editing system",
                "Design YouTube's video recommendation system",
                "Design a URL shortener at Google scale",
                "How would you design Google Maps routing?",
                "Explain consistency models in distributed systems",
            ],
            "hr": [
                "Tell me about a time you disagreed with a teammate and how you resolved it",
                "Describe a time you had to learn something quickly to complete a project",
                "How do you handle ambiguity in project requirements?",
                "Tell me about a time you helped someone on your team improve",
            ],
        },
        "bond": None,
        "training": {
            "duration": "2-4 weeks (Noogler onboarding) + 3-6 months ramp-up",
            "location": "Bangalore / Hyderabad (India)",
            "stipend": "Full salary from day one",
            "details": "Google's Noogler onboarding includes orientation, codelab exercises, starter projects, and a buddy/mentor assignment. New engineers ramp up on Google's internal tools (Blaze, Borg, Piper) and typically submit their first CL (changelist) within the first few weeks. There is no formal classroom training.",
        },
        "work_locations": ["Bangalore", "Hyderabad", "Gurgaon"],
        "tech_stack": ["C++", "Java", "Python", "Go", "Kotlin", "TensorFlow", "Kubernetes", "Spanner", "BigQuery", "GCP", "Angular", "Protocol Buffers", "gRPC"],
        "wfh_policy": "Hybrid — 3 days in-office, 2 days remote. Some teams offer more flexibility. Full remote roles are rare for India.",
        "career_growth": [
            {"years": "0-2", "role": "L3 Software Engineer", "salary_range": "25 - 40 LPA (base + stock)"},
            {"years": "2-4", "role": "L4 Senior Software Engineer", "salary_range": "40 - 65 LPA"},
            {"years": "4-7", "role": "L5 Staff Engineer", "salary_range": "65 - 1 Cr LPA"},
            {"years": "7-12+", "role": "L6+ Senior Staff / Principal", "salary_range": "1 Cr+ LPA"},
        ],
        "benefits": ["Premium Health Insurance (self + family)", "Free Meals & Snacks", "Gym & Wellness Center", "Generous Parental Leave", "RSUs (Restricted Stock Units)", "Annual Bonus", "Learning & Development Budget", "Relocation Support", "Commuter Shuttle", "On-site Childcare"],
        "bench_risk": None,
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
        # ── New enriched fields ──
        "description": "Amazon is a global technology and e-commerce giant, with a massive engineering footprint in India. Its India development centers are among the largest outside the US.",
        "headquarters": "Seattle, Washington, USA (India HQ: Bangalore, Hyderabad)",
        "founded": 1994,
        "employee_count": "1,500,000+ (global); 100,000+ tech in India",
        "website": "https://www.amazon.jobs",
        "glassdoor_rating": 3.9,
        "work_culture": "High-performance, ownership-driven culture guided by 16 Leadership Principles. Fast-paced with high expectations. Emphasizes customer obsession, bias for action, and frugality.",
        "roles_offered": [
            {
                "title": "SDE-1 (Software Development Engineer)",
                "package_lpa": "20 - 35",
                "description": "Entry-level software engineer building scalable services for Amazon retail, AWS, Alexa, Prime Video, or Kindle. High ownership and impact from day one.",
                "skills_required": ["DSA (Medium/Hard)", "System Design", "Java/Python/C++", "OOP Design", "Leadership Principles"],
                "growth_path": "SDE-1 → SDE-2 → SDE-3 (Senior) → Principal → Distinguished",
            },
            {
                "title": "SDE-1 (with signing bonus + RSUs)",
                "package_lpa": "35 - 50 (total comp over 4 years)",
                "description": "Top-tier SDE-1 offers include significant signing bonuses (front-loaded) and RSUs vesting over 4 years (5-15-40-40 schedule).",
                "skills_required": ["Strong DSA", "System Design", "Distributed Systems Basics", "Competitive Coding Background"],
                "growth_path": "SDE-1 → SDE-2 (2-3 years) → SDE-3 → Principal Engineer",
            },
            {
                "title": "SDE Intern",
                "package_lpa": "Stipend: ₹60,000 - ₹1,00,000/month",
                "description": "Summer internship for pre-final year students. Work on real team projects. Strong performers receive return offers for SDE-1.",
                "skills_required": ["DSA", "OOP", "Problem Solving", "Any Programming Language"],
                "growth_path": "Intern → Return Offer → SDE-1",
            },
        ],
        "past_questions_categorized": {
            "aptitude": [],
            "coding": [
                "Two Sum (LeetCode 1)",
                "Find the kth largest element in an unsorted array (LeetCode 215)",
                "Longest Substring Without Repeating Characters (LeetCode 3)",
                "Number of Islands (LeetCode 200)",
                "Rotting Oranges (LeetCode 994)",
                "Course Schedule — Topological Sort (LeetCode 207)",
            ],
            "technical": [
                "Design a URL shortener like bit.ly",
                "Design a parking lot system (OOP Design)",
                "Design an elevator system",
                "How would you design Amazon's recommendation engine?",
                "Explain the differences between SQL and NoSQL — when to use what?",
            ],
            "hr": [
                "Tell me about a time you went above and beyond (LP: Deliver Results)",
                "Describe a situation where you had to make a decision without all the data (LP: Bias for Action)",
                "Tell me about a time you disagreed with your manager (LP: Have Backbone)",
                "Describe when you simplified a complex process (LP: Invent and Simplify)",
                "Tell me about a time you failed (LP: Learn and Be Curious)",
            ],
        },
        "bond": None,
        "training": {
            "duration": "1-2 weeks orientation + 3-6 months ramp-up",
            "location": "Bangalore / Hyderabad",
            "stipend": "Full salary from day one",
            "details": "Amazon's onboarding includes a 1-2 week orientation covering internal tools, services, and culture. New SDE-1s are assigned an onboarding buddy and a mentor. Ramp-up involves working on real tickets/projects with increasing complexity. No formal classroom training — learning is on-the-job.",
        },
        "work_locations": ["Bangalore", "Hyderabad", "Chennai", "Delhi NCR (Gurgaon/Noida)", "Mumbai"],
        "tech_stack": ["Java", "Python", "C++", "TypeScript", "AWS (DynamoDB, S3, Lambda, EC2, SQS, SNS)", "React", "Kotlin", "Go", "Coral/Brazil (internal frameworks)", "Redshift"],
        "wfh_policy": "Hybrid — 3 days in-office mandated (Mon/Tue/Thu). Some teams allow 2 WFH days. Fully remote roles are rare.",
        "career_growth": [
            {"years": "0-2", "role": "SDE-1", "salary_range": "20 - 35 LPA (base + RSU + bonus)"},
            {"years": "2-4", "role": "SDE-2", "salary_range": "35 - 55 LPA"},
            {"years": "4-7", "role": "SDE-3 (Senior)", "salary_range": "55 - 85 LPA"},
            {"years": "7-12+", "role": "Principal / Sr. Principal", "salary_range": "85 LPA - 1.5 Cr+"},
        ],
        "benefits": ["Health Insurance (premium)", "RSUs (4-year vesting)", "Signing Bonus (Year 1 & 2)", "Relocation Allowance", "Annual Bonus", "Free Meals (some offices)", "Commuter Benefits", "Learning & Development Budget", "Parental Leave"],
        "bench_risk": None,
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
        # ── New enriched fields ──
        "description": "Microsoft is a global technology leader in cloud computing (Azure), productivity software (Office 365), gaming (Xbox), and AI (Copilot). Its India Development Center is one of the largest engineering hubs outside Redmond.",
        "headquarters": "Redmond, Washington, USA (India HQ: Hyderabad, Bangalore, Noida)",
        "founded": 1975,
        "employee_count": "220,000+",
        "website": "https://careers.microsoft.com",
        "glassdoor_rating": 4.2,
        "work_culture": "Growth mindset culture championed by CEO Satya Nadella. Collaborative, inclusive, and innovation-focused. Known for excellent work-life balance among Big Tech. Strong emphasis on empathy and learning from failures.",
        "roles_offered": [
            {
                "title": "Software Engineer (SDE, Level 59-60)",
                "package_lpa": "20 - 38",
                "description": "Entry-level engineering role working on Azure, Office 365, Windows, Bing, LinkedIn, or Teams. Full ownership of feature design, development, and deployment.",
                "skills_required": ["DSA (Medium/Hard)", "System Design", "C++/Java/C#/Python", "OS Concepts", "Problem Solving"],
                "growth_path": "SDE (59-60) → SDE II (61-62) → Senior SDE (63-64) → Principal (65-67) → Partner+",
            },
            {
                "title": "Software Engineer (top offer with stock)",
                "package_lpa": "38 - 48 (total comp with RSUs)",
                "description": "Premium offers for exceptional candidates include higher base, signing bonus, and RSUs vesting annually.",
                "skills_required": ["Strong DSA", "System Design", "Competitive Programming", "Deep CS Fundamentals"],
                "growth_path": "SDE → SDE II (1.5-3 years) → Senior → Principal → Distinguished Engineer",
            },
            {
                "title": "Software Engineering Intern",
                "package_lpa": "Stipend: ₹60,000 - ₹80,000/month + housing",
                "description": "12-week summer internship for pre-final year students. Real-world projects with mentorship. Strong performers get return offers.",
                "skills_required": ["DSA", "OOP", "Any Programming Language", "Problem Solving"],
                "growth_path": "Intern → Return Offer → SDE (Level 59)",
            },
        ],
        "past_questions_categorized": {
            "aptitude": [],
            "coding": [
                "Implement a stack using queues (LeetCode 225)",
                "Lowest Common Ancestor of a Binary Tree (LeetCode 236)",
                "Clone Graph (LeetCode 133)",
                "Design an autocomplete/typeahead system",
                "Find all permutations of a string",
                "Binary Tree Level Order Traversal (LeetCode 102)",
            ],
            "technical": [
                "Design an autocomplete system for a search engine",
                "Explain deadlock — give a real-world example and how to prevent it",
                "Design a file synchronization service like OneDrive",
                "How does virtual memory work? Explain page replacement algorithms",
                "What would you improve about Microsoft Teams? (product sense)",
            ],
            "hr": [
                "Tell me about a project you're most proud of and the design decisions you made",
                "Describe a time you received critical feedback. How did you respond?",
                "What excites you about Microsoft's mission?",
                "Tell me about a time you learned a new technology to solve a problem",
            ],
        },
        "bond": None,
        "training": {
            "duration": "1-2 weeks orientation + 3-6 months ramp-up",
            "location": "Hyderabad / Bangalore / Noida",
            "stipend": "Full salary from day one",
            "details": "Microsoft's NEO (New Employee Orientation) covers culture, tools, and processes over 1-2 weeks. New engineers are assigned a buddy and a mentor, and work on real projects during their ramp-up period. Microsoft uses an internal tech stack (Azure DevOps, VS Code, internal tools) and provides extensive documentation and learning resources.",
        },
        "work_locations": ["Hyderabad", "Bangalore", "Noida"],
        "tech_stack": ["C#", "C++", "Java", "Python", "TypeScript", "Azure", ".NET", "React", "Kubernetes", "VS Code", "PowerShell", "SQL Server", "Cosmos DB"],
        "wfh_policy": "Hybrid — flexible. Microsoft is among the most WFH-friendly Big Tech companies. Most teams allow 2-3 days remote per week. Fully remote options available for some roles.",
        "career_growth": [
            {"years": "0-2", "role": "SDE (Level 59-60)", "salary_range": "20 - 38 LPA (base + stock)"},
            {"years": "2-4", "role": "SDE II (Level 61-62)", "salary_range": "38 - 55 LPA"},
            {"years": "4-7", "role": "Senior SDE (Level 63-64)", "salary_range": "55 - 80 LPA"},
            {"years": "7-12+", "role": "Principal+ (Level 65+)", "salary_range": "80 LPA - 1.5 Cr+"},
        ],
        "benefits": ["Premium Health Insurance", "RSUs (annual vesting)", "Annual Performance Bonus", "Wellness Reimbursement", "Free LinkedIn Learning + Pluralsight", "Generous Parental Leave", "Flexible WFH", "Employee Discount on Microsoft Products", "Commuter Benefits", "On-site Childcare (select offices)"],
        "bench_risk": None,
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
        # ── New enriched fields ──
        "description": "Deloitte is one of the Big Four professional services firms, providing audit, consulting, tax, and advisory services. Its USI (US-India) offices handle a large chunk of US consulting delivery.",
        "headquarters": "London, UK (India offices: Hyderabad, Bangalore, Mumbai, Pune, Chennai, Gurgaon)",
        "founded": 1845,
        "employee_count": "460,000+ (global); 80,000+ in India",
        "website": "https://www2.deloitte.com/in/en/careers.html",
        "glassdoor_rating": 3.9,
        "work_culture": "Professional, client-centric consulting culture. Strong emphasis on continuous learning, mentorship, and structured career progression. Known for work-life balance relative to other Big Four. USI roles involve working with US-based teams.",
        "roles_offered": [
            {
                "title": "Analyst (USI Consulting)",
                "package_lpa": "7.5 - 9",
                "description": "Entry-level consulting role working on technology advisory, business analysis, ERP implementations, and digital transformation projects for US/global clients.",
                "skills_required": ["SQL/Excel", "Communication", "Case Study Frameworks", "Business Analysis", "Presentation Skills"],
                "growth_path": "Analyst → Senior Analyst → Consultant → Senior Consultant → Manager → Senior Manager → Director → Partner",
            },
            {
                "title": "Analyst (Tax/Audit)",
                "package_lpa": "6 - 8",
                "description": "Entry-level role in tax compliance, audit, or risk advisory. More structured and predictable work compared to consulting.",
                "skills_required": ["Accounting Basics", "Excel", "Communication", "Attention to Detail", "Analytical Thinking"],
                "growth_path": "Analyst → Senior Analyst → Assistant Manager → Manager → Director → Partner",
            },
            {
                "title": "Software Engineer (USI Technology)",
                "package_lpa": "10 - 14",
                "description": "Technology-focused role in Deloitte's engineering practice. Works on cloud migration, data engineering, application development, and cyber security.",
                "skills_required": ["Java/Python", "Cloud (AWS/Azure)", "SQL", "DevOps Basics", "Agile Methodology"],
                "growth_path": "SE → Senior SE → Lead → Solution Architect → Director",
            },
        ],
        "past_questions_categorized": {
            "aptitude": [
                "Data interpretation: read a bar graph and answer 4-5 questions",
                "A company's revenue grew 15% YoY. What is the CAGR over 3 years?",
                "Logical reasoning: seating arrangement puzzle",
                "Critical thinking: evaluate an argument for validity",
            ],
            "coding": [
                "SQL: Find the top 3 departments by average salary using aggregation",
                "Write a Python script to parse a CSV and compute statistics",
                "SQL: JOIN two tables and find employees without a manager",
                "Basic Excel: VLOOKUP, pivot table questions (for analyst roles)",
            ],
            "technical": [
                "Case study: A retail client wants to optimize their supply chain — propose a solution",
                "What is digital transformation? Give an example from any industry",
                "Explain Agile vs Waterfall — when would you choose each?",
                "What is cloud computing? How does it benefit enterprises?",
                "Describe the data lifecycle in a consulting project",
            ],
            "hr": [
                "Describe a time you led a team or took initiative",
                "Why consulting? Why Deloitte specifically?",
                "How do you handle ambiguous requirements from a client?",
                "Where do you see yourself in 5 years at Deloitte?",
                "Tell me about a time you had to present a complex idea to a non-technical audience",
            ],
        },
        "bond": {
            "duration": "2 years (USI roles)",
            "penalty": "₹1,50,000 - ₹2,00,000",
            "details": "Deloitte USI typically has a 2-year service agreement for campus hires. Penalty is deducted from final settlement. Tax/audit roles may have a shorter bond (1 year).",
        },
        "training": {
            "duration": "2-4 weeks (Deloitte University + on-the-job)",
            "location": "Hyderabad (Deloitte University India campus) / virtual",
            "stipend": "Full salary during training",
            "details": "Deloitte's onboarding includes a stay at Deloitte University India (Hyderabad campus) covering consulting skills, client engagement, technical foundations, and soft skills. Post-onboarding, analysts receive project-specific training and ongoing mentorship through the 'CounSELor' program.",
        },
        "work_locations": ["Hyderabad", "Bangalore", "Mumbai", "Pune", "Chennai", "Gurgaon", "Kolkata"],
        "tech_stack": ["SAP", "Oracle", "Salesforce", "AWS", "Azure", "Python", "SQL", "Power BI", "Tableau", "Java", "ServiceNow", "Workday"],
        "wfh_policy": "Hybrid — varies by project. Consulting roles may require client-site visits. USI roles typically 3 days in office.",
        "career_growth": [
            {"years": "0-2", "role": "Analyst", "salary_range": "6 - 10 LPA"},
            {"years": "2-4", "role": "Senior Analyst / Consultant", "salary_range": "10 - 16 LPA"},
            {"years": "4-7", "role": "Senior Consultant / Manager", "salary_range": "16 - 25 LPA"},
            {"years": "7-12", "role": "Senior Manager / Director", "salary_range": "28 - 45 LPA"},
        ],
        "benefits": ["Health Insurance (comprehensive)", "Cab Facility", "Meal Card", "Relocation Allowance", "Deloitte University Learning", "Performance Bonus", "Professional Certifications Sponsorship", "Parental Leave", "Employee Assistance Program"],
        "bench_risk": "Low to Moderate — consulting roles are typically billable. There may be short gaps (1-3 weeks) between project transitions. Technology roles have slightly higher bench risk.",
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
        # ── New enriched fields ──
        "description": "Capgemini is a French multinational IT consulting and services company, one of the largest in the world, with a significant presence in India for engineering and technology services.",
        "headquarters": "Paris, France (India HQ: Mumbai)",
        "founded": 1967,
        "employee_count": "360,000+ (global); 180,000+ in India",
        "website": "https://www.capgemini.com/in-en/careers/",
        "glassdoor_rating": 3.7,
        "work_culture": "Collaborative, people-first culture with a European management style. Known for good work-life balance, inclusive policies, and a strong focus on sustainability. Less hierarchical than traditional Indian IT companies.",
        "roles_offered": [
            {
                "title": "Associate Consultant (A6)",
                "package_lpa": "3.8",
                "description": "Entry-level role in application development, testing, or support. Works across various technology domains and client projects.",
                "skills_required": ["Basic Coding", "Communication", "Logical Reasoning", "SQL", "Teamwork"],
                "growth_path": "A6 (Associate Consultant) → A5 (Senior Consultant) → A4 (Manager) → A3 (Senior Manager) → A2 (Director)",
            },
            {
                "title": "Senior Analyst (A5)",
                "package_lpa": "6 - 7.5",
                "description": "Higher-tier fresher role for candidates with strong technical aptitude. Placed on digital transformation, cloud, or data projects.",
                "skills_required": ["Java/Python", "DBMS", "DSA Basics", "Cloud Awareness", "Communication"],
                "growth_path": "A5 → A4 (Manager) → A3 (Senior Manager) → Director",
            },
            {
                "title": "Analyst / Engineer (Specialized)",
                "package_lpa": "7 - 9.5",
                "description": "Premium hire for candidates with strong coding skills or domain expertise in cloud, data engineering, or cybersecurity.",
                "skills_required": ["Intermediate DSA", "Cloud (AWS/Azure)", "Full-Stack Basics", "DevOps Awareness", "Problem Solving"],
                "growth_path": "Analyst → Senior Analyst → Lead → Architect → Director",
            },
        ],
        "past_questions_categorized": {
            "aptitude": [
                "Game-based: balloon inflation (risk assessment)",
                "Game-based: card sorting (pattern recognition and decision-making)",
                "Game-based: emotion detection from faces",
                "Logical reasoning: number series completion",
            ],
            "coding": [
                "Print a triangle/pyramid pattern using nested loops",
                "Find if a given string matches a pattern (basic regex matching)",
                "Write a program to find the sum of even Fibonacci numbers up to N",
                "Implement a simple queue using arrays",
            ],
            "technical": [
                "MCQ: What is the time complexity of binary search?",
                "MCQ: Which SQL clause is used to filter groups?",
                "MCQ: What is the output of this Java code snippet? (OOP concepts)",
                "MCQ: What layer of OSI model handles routing?",
                "What is DevOps? Explain CI/CD pipeline",
            ],
            "hr": [
                "What makes you a good team player? Give a specific example",
                "How do you handle pressure and tight deadlines?",
                "Why Capgemini?",
                "Describe a situation where you had to adapt to a major change",
                "What are your long-term career goals?",
            ],
        },
        "bond": {
            "duration": "1 year",
            "penalty": "₹50,000 - ₹75,000",
            "details": "Capgemini has a 1-year service agreement from date of joining. The penalty is relatively lower compared to peers. The bond is enforced upon early exit.",
        },
        "training": {
            "duration": "1.5 - 2 months",
            "location": "Mumbai / Pune / Salem / Bangalore (virtual + on-site)",
            "stipend": "Full salary during training",
            "details": "Capgemini's training program covers technology fundamentals (Java/.NET/Python), domain knowledge, soft skills, Agile methodology, and a capstone project. Training has shifted to a hybrid model with both virtual and in-person components.",
        },
        "work_locations": ["Mumbai", "Pune", "Bangalore", "Chennai", "Hyderabad", "Salem", "Kolkata", "Noida"],
        "tech_stack": ["Java", ".NET", "Python", "SAP", "Salesforce", "Cloud (AWS/Azure/GCP)", "Angular", "React", "DevOps", "Pega", "IICS (Informatica)"],
        "wfh_policy": "Hybrid — 3 days in office, 2 days WFH. Capgemini has been flexible with remote work policies compared to Indian IT peers.",
        "career_growth": [
            {"years": "0-2", "role": "Associate Consultant (A6)", "salary_range": "3.8 - 5 LPA"},
            {"years": "2-4", "role": "Senior Consultant (A5)", "salary_range": "5.5 - 9 LPA"},
            {"years": "4-7", "role": "Manager (A4)", "salary_range": "10 - 15 LPA"},
            {"years": "7-12", "role": "Senior Manager / Director (A3-A2)", "salary_range": "16 - 28 LPA"},
        ],
        "benefits": ["Health Insurance", "Cab Facility", "Meal Card", "Relocation Allowance", "Capgemini University Learning", "Performance Bonus", "Gratuity", "Parental Leave", "Employee Referral Bonus"],
        "bench_risk": "Low to Moderate — Capgemini's large project pipeline usually ensures allocation within 2-4 weeks. Extended bench (1-2 months) may occur for niche technology roles.",
    },
{
        "name": "IBM",
        "logo_color": "#0530AD",
        "category": "IT Services & Consulting",
        "avg_package_lpa": "4.25 - 7.5",
        "dream_package_lpa": "10 - 12 (GBS/Research)",
        "interview_rounds": ["Cognitive Assessment", "Coding Assessment", "English Language Test", "Technical Interview", "HR Interview"],
        "difficulty": "moderate",
        "preparation_time_weeks": 4,
        "key_topics": ["Cognitive Ability", "Basic DSA", "DBMS", "Cloud", "English Proficiency"],
        "tips": [
            "IBM's cognitive assessment (game-based) requires focus and quick reflexes.",
            "English language test is strict; practice basic grammar and spoken English.",
            "Focus on emerging tech (AI, Cloud, Quantum) basics for the technical round.",
            "Projects matter heavily in the interview."
        ],
        "past_questions": ["What is cloud computing?", "Write a program to reverse a string without built-in functions.", "Explain Joins in SQL.", "Why IBM?"],
        "selection_rate": "~30% of eligible",
        "description": "IBM is a global technology and consulting corporation known for its hardware, software, cloud computing, and AI (Watson).",
        "headquarters": "Armonk, New York, USA (India HQ: Bangalore)",
        "founded": 1911,
        "employee_count": "280,000+",
        "website": "https://www.ibm.com/in-en/employment/",
        "glassdoor_rating": 3.9,
        "work_culture": "Professional, research-oriented culture with a strong emphasis on continuous learning and diversity. Good work-life balance compared to typical IT services.",
        "roles_offered": [
            {
                "title": "Associate System Engineer",
                "package_lpa": "4.25 - 4.5",
                "description": "Entry-level development and testing role across global business services.",
                "skills_required": ["Java/Python", "SQL", "Cloud Basics", "Communication"],
                "growth_path": "ASE → Staff Engineer → Advisory Engineer → Senior Engineer"
            },
            {
                "title": "Data Scientist / AI Engineer (Entry Level)",
                "package_lpa": "7 - 9",
                "description": "Works on AI/ML models, data pipelines, and analytics for enterprise clients.",
                "skills_required": ["Python", "Machine Learning", "SQL", "Data Structures"],
                "growth_path": "Data Scientist → Senior Data Scientist → Lead Data Scientist"
            }
        ],
        "past_questions_categorized": {
            "aptitude": ["Game-based cognitive tests: pattern matching, grid solving, numerical reasoning.", "English: grammar correction, reading comprehension."],
            "coding": ["Reverse a string", "Find missing number in array", "Check anagrams"],
            "technical": ["Explain Cloud Deployment Models", "What is an RDBMS?", "Difference between abstract class and interface"],
            "hr": ["Why do you want to join IBM?", "Describe a time you solved a complex problem."]
        },
        "bond": {
            "duration": "None",
            "penalty": "N/A",
            "details": "IBM typically does not have a formal bond for campus hires."
        },
        "training": {
            "duration": "2 months",
            "location": "Virtual / Bangalore / Pune",
            "stipend": "Full salary",
            "details": "Initial training covers corporate culture, agile methodologies, and specific tech stack alignment based on business unit."
        },
        "work_locations": ["Bangalore", "Pune", "Hyderabad", "Noida", "Chennai", "Kolkata"],
        "tech_stack": ["Java", "Python", "Node.js", "IBM Cloud", "AWS", "Red Hat OpenShift", "DB2", "AI/ML"],
        "wfh_policy": "Hybrid — typically 3 days in office. Strict return-to-office mandates have been rolled out recently.",
        "career_growth": [
            {"years": "0-2", "role": "Associate System Engineer", "salary_range": "4.25 - 6 LPA"},
            {"years": "2-5", "role": "Staff Engineer", "salary_range": "7 - 12 LPA"},
            {"years": "5-8", "role": "Advisory Engineer", "salary_range": "13 - 20 LPA"}
        ],
        "benefits": ["Health Insurance", "Relocation Support", "Learning Certifications", "Employee Assistance Program"],
        "bench_risk": "Low"
    },
    {
        "name": "LTIMindtree",
        "logo_color": "#002F6C",
        "category": "IT Services",
        "avg_package_lpa": "4 - 5.5",
        "dream_package_lpa": "6.5 - 8",
        "interview_rounds": ["Online Assessment", "Spoken English Test", "Technical Interview", "HR Interview"],
        "difficulty": "moderate",
        "preparation_time_weeks": 3,
        "key_topics": ["Aptitude", "SQL", "Java/Python Basics", "Core CS"],
        "tips": [
            "Online assessment focuses heavily on quantitative aptitude and logical reasoning.",
            "Technical round expects solid understanding of your final year project.",
            "They frequently ask puzzle questions in HR/Technical rounds."
        ],
        "past_questions": ["SQL query for second highest salary", "Difference between TRUNCATE and DELETE", "Explain SDLC"],
        "selection_rate": "~35% of eligible",
        "description": "LTIMindtree is a global technology consulting and digital solutions company formed by the merger of L&T Infotech and Mindtree.",
        "headquarters": "Mumbai, India",
        "founded": 1996,
        "employee_count": "80,000+",
        "website": "https://www.ltimindtree.com/",
        "glassdoor_rating": 3.6,
        "work_culture": "Fast-growing, performance-oriented culture. Offers good exposure to digital transformation projects.",
        "roles_offered": [
            {
                "title": "Graduate Engineer Trainee",
                "package_lpa": "4",
                "description": "Application development and maintenance across various verticals.",
                "skills_required": ["Java/Python", "SQL", "Aptitude"],
                "growth_path": "GET → Software Engineer → Senior SE → Tech Lead"
            }
        ],
        "past_questions_categorized": {
            "aptitude": ["Time and work problems", "Number series", "Syllogism"],
            "coding": ["Palindrome string", "Factorial using recursion"],
            "technical": ["What is normalization?", "Explain OOP concepts with examples", "Difference between TCP and UDP"],
            "hr": ["Why LTIMindtree?", "Are you willing to relocate?"]
        },
        "bond": {
            "duration": "1 year",
            "penalty": "₹50,000",
            "details": "Standard 1-year service agreement from DOJ."
        },
        "training": {
            "duration": "2 months",
            "location": "Pune / Chennai / Mumbai (Orchard program)",
            "stipend": "Full salary",
            "details": "The 'Orchard' learning program is known for being rigorous with frequent assessments."
        },
        "work_locations": ["Mumbai", "Pune", "Bangalore", "Chennai", "Hyderabad"],
        "tech_stack": ["Java", ".NET", "Python", "Cloud (AWS/Azure)", "Data Engineering"],
        "wfh_policy": "Hybrid — 3 days office.",
        "career_growth": [
            {"years": "0-2", "role": "Software Engineer", "salary_range": "4 - 5.5 LPA"},
            {"years": "2-5", "role": "Senior Software Engineer", "salary_range": "6 - 10 LPA"}
        ],
        "benefits": ["Health Insurance", "Meal Allowances", "Certifications Reimbursement"],
        "bench_risk": "Moderate"
    },
    {
        "name": "Texas Instruments",
        "logo_color": "#CC0000",
        "category": "Core ECE/EEE",
        "avg_package_lpa": "15 - 20",
        "dream_package_lpa": "25 - 35",
        "interview_rounds": ["Online Technical Test", "2-3 Technical Interviews (Analog/Digital/Software)", "HR Interview"],
        "difficulty": "very hard",
        "preparation_time_weeks": 8,
        "key_topics": ["Analog Electronics", "Digital Design", "Network Theory", "Signals & Systems", "C Programming"],
        "tips": [
            "For Analog roles: Mastery of Op-Amps, RC circuits, and network theorems is non-negotiable.",
            "For Digital roles: Verilog, logic gates, setup/hold times, and FSMs are heavily tested.",
            "Be prepared to draw and analyze circuits on a whiteboard.",
            "Strong fundamentals in C (pointers, bitwise operators) required for embedded roles."
        ],
        "past_questions": ["Draw the frequency response of a given RC circuit", "Design a 101 sequence detector", "Explain setup and hold time violations"],
        "selection_rate": "~2% of eligible",
        "description": "Texas Instruments (TI) is a global semiconductor company that designs and manufactures analog and embedded processing chips.",
        "headquarters": "Dallas, Texas, USA (India HQ: Bangalore)",
        "founded": 1930,
        "employee_count": "33,000+",
        "website": "https://careers.ti.com/",
        "glassdoor_rating": 4.1,
        "work_culture": "Deeply technical and research-oriented. High emphasis on engineering excellence and innovation. Exceptional work-life balance for the semiconductor industry.",
        "roles_offered": [
            {
                "title": "Analog Design Engineer",
                "package_lpa": "20 - 30",
                "description": "Design and verify analog ICs, power management chips, and signal chain products.",
                "skills_required": ["Network Theory", "Analog Circuits", "CMOS Design", "Control Systems"],
                "growth_path": "Design Engineer → Senior Engineer → Member Group Technical Staff (MGTS)"
            },
            {
                "title": "Digital Design/Verification Engineer",
                "package_lpa": "20 - 30",
                "description": "RTL design, SoC verification, and physical design of digital ICs.",
                "skills_required": ["Digital Electronics", "Verilog/VHDL", "Computer Architecture", "Scripting"],
                "growth_path": "Design Engineer → Senior Engineer → MGTS"
            },
            {
                "title": "Embedded Software Engineer",
                "package_lpa": "15 - 25",
                "description": "Develop firmware, device drivers, and OS ports for TI microcontrollers.",
                "skills_required": ["C Programming", "Microprocessors", "OS Concepts", "Data Structures"],
                "growth_path": "Software Engineer → Senior SE → MGTS"
            }
        ],
        "past_questions_categorized": {
            "aptitude": ["Usually no separate aptitude round, purely technical assessment."],
            "coding": ["Implement a circular buffer in C", "Bit manipulation: count set bits", "Pointer arithmetic outputs"],
            "technical": ["Derive the transfer function of this active filter", "Design a Moore FSM for sequence '1101'", "Explain the working of a Buck Converter", "Draw CMOS implementation of a NAND gate"],
            "hr": ["Why Texas Instruments?", "Tell me about a time you failed in a lab project.", "Are you planning for higher studies?"]
        },
        "bond": {
            "duration": "None",
            "penalty": "N/A",
            "details": ""
        },
        "training": {
            "duration": "3-6 months (on-the-job)",
            "location": "Bangalore",
            "stipend": "Full salary",
            "details": "Direct project allocation with intensive mentoring by senior engineers (MGTS/SMTS)."
        },
        "work_locations": ["Bangalore"],
        "tech_stack": ["Cadence", "Synopsys Tools", "Verilog/SystemVerilog", "C/C++", "Python", "MATLAB", "SPICE"],
        "wfh_policy": "Hybrid. Hardware testing requires on-site presence.",
        "career_growth": [
            {"years": "0-3", "role": "Engineer", "salary_range": "15 - 25 LPA"},
            {"years": "3-7", "role": "Senior Engineer", "salary_range": "25 - 40 LPA"},
            {"years": "7-12", "role": "MGTS / SMTS", "salary_range": "40 - 70 LPA"}
        ],
        "benefits": ["Premium Health Coverage", "Profit Sharing Plan", "ESPP", "Relocation Support", "Excellent Lab Facilities"],
        "bench_risk": "None"
    },
    {
        "name": "Larsen & Toubro (L&T)",
        "logo_color": "#F3E500",
        "category": "Core Civil/Mech",
        "avg_package_lpa": "6 - 7",
        "dream_package_lpa": "8 - 10",
        "interview_rounds": ["Online Assessment (Aptitude + Technical)", "Group Discussion / Extempore", "Technical Interview", "HR Interview"],
        "difficulty": "moderate",
        "preparation_time_weeks": 4,
        "key_topics": ["Core Subject Fundamentals (Civil/Mech/Elec)", "Strength of Materials", "Fluid Mechanics", "Project Management Basics", "Aptitude"],
        "tips": [
            "Be prepared for questions based on your industrial training/internships.",
            "Aptitude test is known for strict cutoffs.",
            "Willingness to relocate to remote project sites is often a deciding factor.",
            "Brush up on basic IS codes (for Civil) and manufacturing processes (for Mech)."
        ],
        "past_questions": ["Draw SFD and BMD for a cantilever beam", "Explain the Carnot cycle", "What is the difference between CPM and PERT?", "Are you willing to work on-site?"],
        "selection_rate": "~20% of eligible",
        "description": "Larsen & Toubro is an Indian multinational conglomerate, spanning engineering, construction, manufacturing, technology, and financial services.",
        "headquarters": "Mumbai, India",
        "founded": 1938,
        "employee_count": "50,000+ (Core EPC)",
        "website": "https://www.larsentoubro.com/corporate/careers/",
        "glassdoor_rating": 3.8,
        "work_culture": "Traditional engineering culture. High discipline, challenging project environments, and vast scale of operations. Long working hours are common on project sites.",
        "roles_offered": [
            {
                "title": "Graduate Engineer Trainee (GET) - Civil/Mech/Electrical",
                "package_lpa": "6",
                "description": "Site execution, planning, design, or quality control for mega infrastructure/construction projects.",
                "skills_required": ["Core Technical Concepts", "AutoCAD/StaadPro (Civil)", "SolidWorks/ANSYS (Mech)", "Project Management Basics"],
                "growth_path": "GET → Senior Engineer → Assistant Construction Manager → Construction Manager"
            },
            {
                "title": "Post Graduate Engineer Trainee (PGET)",
                "package_lpa": "7 - 8",
                "description": "Specialized roles in design and engineering centers (mostly for M.Tech graduates).",
                "skills_required": ["Advanced Design", "Finite Element Analysis", "Structural Engineering"],
                "growth_path": "PGET → Lead Design Engineer → Engineering Manager"
            }
        ],
        "past_questions_categorized": {
            "aptitude": ["Standard quantitative, logical, and verbal sections. Includes data interpretation related to engineering costs/time."],
            "coding": ["Usually none for core branches (unless applying to LTIMindtree/L&T Tech Services)."],
            "technical": ["What is the grade of concrete used for RCC?", "Explain the difference between 2-stroke and 4-stroke engines", "How do you calculate the safe bearing capacity of soil?", "Explain your final year project."],
            "hr": ["Why L&T?", "Are you ready to work in remote project locations?", "How do you handle conflict with site laborers?"]
        },
        "bond": {
            "duration": "None (For GETs)",
            "penalty": "N/A",
            "details": "L&T usually doesn't have a bond for GETs, but check the offer letter as some specialized verticals might."
        },
        "training": {
            "duration": "1 month orientation + 11 months on-the-job",
            "location": "L&T Leadership Development Academy (Lonavala) or Chennai, followed by site posting",
            "stipend": "Full GET stipend",
            "details": "Comprehensive orientation followed by rigorous on-the-job training at project sites."
        },
        "work_locations": ["Pan India (Often remote project sites)", "Mumbai", "Chennai", "Hazira", "Faridabad"],
        "tech_stack": ["AutoCAD", "STAAD.Pro", "Revit", "ANSYS", "SolidWorks", "Primavera", "MS Project"],
        "wfh_policy": "On-site fully. Design office roles might have limited hybrid flexibility.",
        "career_growth": [
            {"years": "0-1", "role": "GET", "salary_range": "6 LPA"},
            {"years": "1-4", "role": "Senior Engineer", "salary_range": "7 - 10 LPA"},
            {"years": "4-8", "role": "Assistant Manager", "salary_range": "11 - 16 LPA"}
        ],
        "benefits": ["Site Allowances", "Accommodation (at sites)", "Health Insurance", "Subsidized Food (at sites)"],
        "bench_risk": "Low"
    },
    {
        "name": "Tata Motors",
        "logo_color": "#0033A0",
        "category": "Core Mech/Auto",
        "avg_package_lpa": "7 - 8",
        "dream_package_lpa": "9 - 10",
        "interview_rounds": ["Online Test (Aptitude + Core)", "Psychometric Test", "Technical Interview", "HR Interview"],
        "difficulty": "moderate",
        "preparation_time_weeks": 4,
        "key_topics": ["IC Engines", "Automobile Engineering", "Strength of Materials", "Thermodynamics", "Manufacturing Processes"],
        "tips": [
            "Deep knowledge of your final year project/Baja SAE/Supra experience is highly valued.",
            "Familiarity with Electric Vehicle (EV) technology gives a massive edge.",
            "Expect practical questions on manufacturing and quality control (Six Sigma, Kaizen)."
        ],
        "past_questions": ["Explain the working of a differential", "What is the difference between torque and power?", "Explain EV battery management basics"],
        "selection_rate": "~25% of eligible",
        "description": "Tata Motors is India's leading automotive manufacturer, producing commercial, passenger, and electric vehicles.",
        "headquarters": "Mumbai, India",
        "founded": 1945,
        "employee_count": "75,000+",
        "website": "https://www.tatamotors.com/careers/",
        "glassdoor_rating": 3.9,
        "work_culture": "Ethical, employee-friendly Tata culture. Strong focus on R&D, especially in the EV segment. Manufacturing plants have typical shop-floor environments.",
        "roles_offered": [
            {
                "title": "Graduate Engineer Trainee (GET)",
                "package_lpa": "7.5",
                "description": "Roles in R&D, Manufacturing, Quality, or Supply Chain. Shift from ICE to EV technologies.",
                "skills_required": ["Core Mechanical Concepts", "Automobile Systems", "EV Basics", "CAD/CAE"],
                "growth_path": "GET → Assistant Manager → Deputy Manager → Manager"
            }
        ],
        "past_questions_categorized": {
            "aptitude": ["Quantitative, logical, and verbal.", "Psychometric tests to evaluate cultural fit and behavioral traits."],
            "coding": ["Not applicable for core mechanical roles."],
            "technical": ["Draw the P-V and T-S diagram for Otto cycle", "Explain different types of welding", "What are the components of an EV powertrain?", "Questions on CAD models or Baja/Formula Student cars"],
            "hr": ["Why Tata Motors?", "Where do you see the auto industry in 5 years?", "Are you comfortable working in a manufacturing plant?"]
        },
        "bond": {
            "duration": "None",
            "penalty": "N/A",
            "details": "Typically no bond."
        },
        "training": {
            "duration": "6 months",
            "location": "Pune / Jamshedpur / Lucknow",
            "stipend": "Full GET stipend",
            "details": "Classroom training followed by rotations across different departments (shop floor, quality, design) before final allocation."
        },
        "work_locations": ["Pune", "Jamshedpur", "Lucknow", "Sanand", "Dharwad", "Pantnagar"],
        "tech_stack": ["CATIA", "AutoCAD", "MATLAB", "Simulink", "ANSYS", "Siemens NX"],
        "wfh_policy": "On-site. R&D roles in Pune might have slight flexibility.",
        "career_growth": [
            {"years": "0-1", "role": "GET", "salary_range": "7.5 LPA"},
            {"years": "1-4", "role": "Assistant Manager", "salary_range": "8.5 - 12 LPA"},
            {"years": "4-8", "role": "Manager", "salary_range": "13 - 18 LPA"}
        ],
        "benefits": ["Tata Group Discounts", "Health Insurance", "Company Township Accommodation (in some plants)", "Subsidized Transport/Canteen"],
        "bench_risk": "None"
    },
    {
        "name": "Cisco",
        "logo_color": "#1BA0D7",
        "category": "Product/Tech",
        "avg_package_lpa": "15 - 18",
        "dream_package_lpa": "20 - 24",
        "interview_rounds": ["Online Assessment", "Technical Round 1", "Technical Round 2", "Managerial/HR Round"],
        "difficulty": "hard",
        "preparation_time_weeks": 8,
        "key_topics": ["Computer Networks (OSI, TCP/IP, Routing)", "C/C++/Python", "Operating Systems", "DSA", "System Design (Basic)"],
        "tips": [
            "Networking knowledge must be exceptionally strong (OSI, TCP/IP, Subnetting, Routing protocols).",
            "Cisco tests C/C++ concepts thoroughly, especially pointers and memory management.",
            "CCNA certification is a huge plus.",
            "Prepare for embedded systems questions if applying for hardware/embedded roles."
        ],
        "past_questions": ["Explain the 3-way handshake in TCP", "Difference between Hub, Switch, and Router", "Implement a linked list in C", "What happens when you type google.com?"],
        "selection_rate": "~2% of applicants",
        "description": "Cisco is the worldwide leader in IT, networking, and cybersecurity solutions.",
        "headquarters": "San Jose, California, USA (India HQ: Bangalore)",
        "founded": 1984,
        "employee_count": "80,000+",
        "website": "https://jobs.cisco.com/",
        "glassdoor_rating": 4.2,
        "work_culture": "Highly flexible, inclusive, and relaxed culture. Consistently ranked as a great place to work. Great focus on employee well-being and open communication.",
        "roles_offered": [
            {
                "title": "Software Engineer (Network/Cloud/Security)",
                "package_lpa": "15 - 20",
                "description": "Develop and test networking protocols, SDN, cloud platforms, or security software.",
                "skills_required": ["C/C++/Python", "Networking", "OS", "DSA"],
                "growth_path": "Software Engineer I → SE II → Senior SE → Technical Leader"
            },
            {
                "title": "Hardware Engineer",
                "package_lpa": "15 - 20",
                "description": "Design and verify ASICs, FPGAs, and board-level hardware for routers and switches.",
                "skills_required": ["Digital Electronics", "Verilog/VHDL", "Computer Architecture"],
                "growth_path": "Hardware Engineer I → HE II → Senior HE → Technical Leader"
            },
            {
                "title": "Consulting Engineer (CX)",
                "package_lpa": "12 - 15",
                "description": "Customer Experience role involving network design, implementation, and troubleshooting for enterprise clients.",
                "skills_required": ["CCNA level networking", "Communication", "Troubleshooting"],
                "growth_path": "Consulting Engineer I → CE II → Senior CE"
            }
        ],
        "past_questions_categorized": {
            "aptitude": ["Basic quantitative and logical reasoning in the initial OA."],
            "coding": ["Reverse bits of an integer", "Find loop in a linked list", "String manipulation"],
            "technical": ["Detailed explanation of BGP and OSPF", "Subnetting calculations", "How does ARP work?", "Explain virtual memory"],
            "hr": ["Why networking?", "Tell me about a time you worked in a team.", "Where do you see yourself in 3 years?"]
        },
        "bond": {
            "duration": "None",
            "penalty": "N/A",
            "details": ""
        },
        "training": {
            "duration": "3 months",
            "location": "Bangalore",
            "stipend": "Full salary",
            "details": "Robust onboarding program (CSAP for sales/consulting, direct team integration for engineering). Mentorship is highly emphasized."
        },
        "work_locations": ["Bangalore", "Pune", "Gurgaon"],
        "tech_stack": ["C", "C++", "Python", "Go", "BGP/OSPF", "Linux Internals", "Docker/Kubernetes"],
        "wfh_policy": "Highly flexible hybrid model. Cisco is very supportive of remote work.",
        "career_growth": [
            {"years": "0-2", "role": "Software Engineer I", "salary_range": "15 - 20 LPA"},
            {"years": "2-5", "role": "Software Engineer II", "salary_range": "20 - 30 LPA"},
            {"years": "5-8", "role": "Senior Software Engineer", "salary_range": "30 - 45 LPA"}
        ],
        "benefits": ["Premium Health Insurance", "ESPP", "Generous Time Off", "Wellness Days", "Fitness Reimbursement"],
        "bench_risk": "None"
    },
{
        "name": "Hexaware",
        "logo_color": "#00AEEF",
        "category": "IT Services",
        "avg_package_lpa": "3.5 - 5",
        "dream_package_lpa": "6 - 8 (Premier/Maverick)",
        "interview_rounds": ["Online Assessment", "Communication Test", "Technical Interview", "HR Interview"],
        "difficulty": "easy-moderate",
        "preparation_time_weeks": 3,
        "key_topics": ["Aptitude", "English Communication", "SQL", "Java/.NET Basics"],
        "tips": [
            "Communication test (Versant) eliminates many candidates; practice speaking clearly.",
            "Aptitude test focuses on speed.",
            "Technical round is usually straightforward, focusing on core OOPs and project."
        ],
        "past_questions": ["Explain Polymorphism", "What are the different types of keys in SQL?", "Where do you see yourself in 3 years?"],
        "selection_rate": "~40% of eligible",
        "description": "Hexaware Technologies is an IT and business process outsourcing service provider specializing in cloud, automation, and customer experience.",
        "headquarters": "Navi Mumbai, India",
        "founded": 1990,
        "employee_count": "30,000+",
        "website": "https://hexaware.com/careers/",
        "glassdoor_rating": 3.7,
        "work_culture": "Employee-centric and agile culture. Known for rapid growth opportunities and a focus on automation-first approaches.",
        "roles_offered": [
            {
                "title": "Graduate Engineer Trainee (GET)",
                "package_lpa": "3.5 - 4",
                "description": "Entry-level IT services role for application support and development.",
                "skills_required": ["Basic Coding", "SQL", "Communication", "Aptitude"],
                "growth_path": "GET → Software Engineer → Senior SE"
            },
            {
                "title": "Premier / Maverick",
                "package_lpa": "6 - 8",
                "description": "Higher package role for students clearing advanced coding rounds.",
                "skills_required": ["Intermediate DSA", "Full-Stack Basics", "Java/Python"],
                "growth_path": "Premier GET → Senior SE → Tech Lead"
            }
        ],
        "past_questions_categorized": {
            "aptitude": ["Number series, percentage, profit and loss."],
            "coding": ["Find if a number is prime", "Sum of elements in an array"],
            "technical": ["What is an abstract class?", "Explain DDL and DML commands in SQL"],
            "hr": ["Why Hexaware?", "Are you willing to work in shifts?"]
        },
        "bond": {
            "duration": "2 years",
            "penalty": "₹1,00,000",
            "details": "Service agreement is standard for freshers."
        },
        "training": {
            "duration": "2 months",
            "location": "Chennai / Mumbai / Pune",
            "stipend": "Full salary",
            "details": "Classroom and hands-on training with regular assessments."
        },
        "work_locations": ["Chennai", "Mumbai", "Pune", "Bangalore", "Noida"],
        "tech_stack": ["Java", ".NET", "Python", "Automation Anywhere", "UiPath", "ServiceNow"],
        "wfh_policy": "Hybrid.",
        "career_growth": [
            {"years": "0-2", "role": "Software Engineer", "salary_range": "3.5 - 5 LPA"},
            {"years": "2-5", "role": "Senior Software Engineer", "salary_range": "5 - 8 LPA"}
        ],
        "benefits": ["Health Insurance", "Relocation Allowance", "Cab Facility"],
        "bench_risk": "Moderate"
    },
    {
        "name": "Qualcomm",
        "logo_color": "#3253AD",
        "category": "Core ECE/IT",
        "avg_package_lpa": "18 - 25",
        "dream_package_lpa": "30 - 35",
        "interview_rounds": ["Online Assessment (Coding + Core)", "2-3 Technical Interviews", "HR Interview"],
        "difficulty": "hard",
        "preparation_time_weeks": 8,
        "key_topics": ["C/C++", "Data Structures", "Digital Electronics", "Computer Architecture", "Wireless Communication"],
        "tips": [
            "For software roles, expect intense C/C++ questions (pointers, memory leaks, bitwise).",
            "For hardware roles, digital logic, VLSI basics, and Verilog are crucial.",
            "They dive deep into your resume projects."
        ],
        "past_questions": ["Implement malloc() and free()", "Explain the OSI model layers", "How does a cache work?"],
        "selection_rate": "~2% of applicants",
        "description": "Qualcomm is a multinational semiconductor and telecommunications equipment company, famous for its Snapdragon processors and 5G technology.",
        "headquarters": "San Diego, California, USA (India HQ: Hyderabad)",
        "founded": 1985,
        "employee_count": "50,000+",
        "website": "https://www.qualcomm.com/company/careers",
        "glassdoor_rating": 4.1,
        "work_culture": "Innovation-driven, highly technical. Great perks and compensation. Work-life balance can vary depending on project tape-out cycles.",
        "roles_offered": [
            {
                "title": "Software Engineer",
                "package_lpa": "18 - 25",
                "description": "Embedded software, modem software, and android framework development.",
                "skills_required": ["C/C++", "OS Internals", "Data Structures", "Networking Basics"],
                "growth_path": "Engineer → Senior Engineer → Staff Engineer → Senior Staff Engineer"
            },
            {
                "title": "Hardware Engineer",
                "package_lpa": "18 - 25",
                "description": "ASIC design, verification, and physical design.",
                "skills_required": ["Digital Electronics", "Computer Architecture", "Verilog", "VLSI"],
                "growth_path": "Engineer → Senior Engineer → Staff Engineer"
            }
        ],
        "past_questions_categorized": {
            "aptitude": ["Usually minimal, focus is heavily on technical problem solving."],
            "coding": ["Bit manipulation (e.g., toggle specific bits)", "Linked list reversals", "String manipulation in C"],
            "technical": ["Explain virtual memory and page faults", "Design a FIFO", "What is setup and hold time?", "Explain TDMA/FDMA/CDMA concepts"],
            "hr": ["Why Qualcomm?", "Discuss a time you faced a difficult technical challenge."]
        },
        "bond": {
            "duration": "None",
            "penalty": "N/A",
            "details": ""
        },
        "training": {
            "duration": "On-the-job",
            "location": "Hyderabad / Bangalore",
            "stipend": "Full salary",
            "details": "Direct team allocation with a mentor."
        },
        "work_locations": ["Hyderabad", "Bangalore", "Noida", "Chennai"],
        "tech_stack": ["C", "C++", "Python", "Verilog", "Linux Kernel", "Android Framework"],
        "wfh_policy": "Hybrid.",
        "career_growth": [
            {"years": "0-3", "role": "Engineer", "salary_range": "18 - 25 LPA"},
            {"years": "3-7", "role": "Senior Engineer", "salary_range": "25 - 40 LPA"}
        ],
        "benefits": ["Premium Health Insurance", "RSUs", "ESPP", "Free Meals (some offices)"],
        "bench_risk": "None"
    },
    {
        "name": "Reliance Industries",
        "logo_color": "#005CAB",
        "category": "Core/Mass (Jio/RIL)",
        "avg_package_lpa": "5 - 7",
        "dream_package_lpa": "12 - 15 (Jio R&D)",
        "interview_rounds": ["Online Assessment", "Technical Interview", "HR Interview"],
        "difficulty": "moderate",
        "preparation_time_weeks": 3,
        "key_topics": ["Core Engineering (Mech/Chem/Civil)", "Java/Python (Jio)", "Aptitude", "Current Tech Trends"],
        "tips": [
            "For Jio: Focus on Java, networking, and standard software engineering practices.",
            "For RIL Core (Refinery/Petrochem): Be ready for deep core engineering and safety questions.",
            "Showcase long-term commitment and adaptability."
        ],
        "past_questions": ["Explain OOPS concepts", "What is distillation? (Chem)", "Explain the working of 4G LTE (Jio)"],
        "selection_rate": "~25% of eligible",
        "description": "Reliance Industries Limited (RIL) is a Fortune 500 company and the largest private sector corporation in India, with major businesses in energy, petrochemicals, retail, and telecommunications (Jio).",
        "headquarters": "Mumbai, India",
        "founded": 1958,
        "employee_count": "340,000+",
        "website": "https://careers.ril.com/",
        "glassdoor_rating": 3.8,
        "work_culture": "Scale-driven, fast-paced, and demanding. Offers immense exposure to mega-scale projects (refineries, pan-India telecom). Hierarchical but rewarding.",
        "roles_offered": [
            {
                "title": "Graduate Engineer Trainee (Core)",
                "package_lpa": "5.5 - 7",
                "description": "Plant operations, maintenance, and project execution at refineries/manufacturing sites.",
                "skills_required": ["Core Technical Knowledge", "Safety Standards", "Analytical Thinking"],
                "growth_path": "GET → Manager → Senior Manager"
            },
            {
                "title": "Software Engineer (Jio Platforms)",
                "package_lpa": "7 - 12",
                "description": "Development for Jio's digital ecosystem (apps, telecom backend, cloud).",
                "skills_required": ["Java/Python", "DSA", "DBMS", "API Development"],
                "growth_path": "Software Engineer → Senior SE → Tech Lead"
            }
        ],
        "past_questions_categorized": {
            "aptitude": ["Standard quantitative and logical reasoning."],
            "coding": ["Array and String manipulation (for Jio roles)."],
            "technical": ["Core branch subjects for RIL.", "For Jio: Java Spring Boot basics, SQL vs NoSQL, Networking basics."],
            "hr": ["Are you willing to work in Jamnagar/Hazira? (For Core)", "Why Reliance?"]
        },
        "bond": {
            "duration": "None for most roles",
            "penalty": "N/A",
            "details": ""
        },
        "training": {
            "duration": "6 months (GET program)",
            "location": "Reliance Corporate Park (Navi Mumbai) / Jamnagar",
            "stipend": "Full stipend",
            "details": "RIL's GET program is highly structured with classroom learning and on-the-job rotations."
        },
        "work_locations": ["Mumbai", "Jamnagar", "Hazira", "Bangalore", "Hyderabad (Jio)"],
        "tech_stack": ["Java", "Python", "React", "AWS/Azure", "Big Data (for Jio)"],
        "wfh_policy": "Mostly On-site.",
        "career_growth": [
            {"years": "0-1", "role": "GET", "salary_range": "5.5 - 7 LPA"},
            {"years": "1-5", "role": "Manager", "salary_range": "8 - 14 LPA"}
        ],
        "benefits": ["Subsidized Township Housing (at plant locations)", "Health Insurance", "Reliance Employee Discounts"],
        "bench_risk": "Low"
    },
    {
        "name": "Samsung R&D",
        "logo_color": "#1428A0",
        "category": "Product/Tech",
        "avg_package_lpa": "12 - 16",
        "dream_package_lpa": "20 - 22 (SRIB)",
        "interview_rounds": ["Samsung Global Coding Test (3 hours, 1 question)", "Technical Interview 1", "Technical Interview 2", "HR Interview"],
        "difficulty": "hard",
        "preparation_time_weeks": 8,
        "key_topics": ["Advanced Data Structures", "Graph Algorithms", "Backtracking", "Dynamic Programming", "C/C++/Java"],
        "tips": [
            "The coding test is notoriously strict: 1 question, 3 hours, 50 test cases, NO STL allowed (must write own stack, queue, etc. in C/C++).",
            "Master DFS, BFS, Backtracking, and Graph traversal.",
            "Interviews focus heavily on the logic used in the coding test and CS fundamentals."
        ],
        "past_questions": ["Wormhole problem", "Endoscope problem", "Travelling Salesman variant (all standard Samsung test questions)"],
        "selection_rate": "~1% of applicants",
        "description": "Samsung R&D Institute (SRIB/SRID/SRIN) is Samsung's largest R&D facility outside Korea, focusing on AI, IoT, Networks, and Mobile software.",
        "headquarters": "Suwon, South Korea (India HQ: Bangalore - SRIB, Delhi - SRID, Noida - SRIN)",
        "founded": 1969,
        "employee_count": "10,000+ in India R&D",
        "website": "https://research.samsung.com/sri-b",
        "glassdoor_rating": 3.8,
        "work_culture": "Highly competitive, research-driven environment. Work hours can be long, especially before major product launches, but exposure to cutting-edge consumer tech is immense.",
        "roles_offered": [
            {
                "title": "Software Engineer",
                "package_lpa": "14 - 20",
                "description": "Work on Android framework, Tizen OS, AI/Camera algorithms, or 5G/6G networks.",
                "skills_required": ["Strong algorithmic thinking (Backtracking/Graphs)", "C/C++/Java", "OS Concepts", "System Architecture"],
                "growth_path": "Software Engineer → Senior SE → Chief Engineer"
            }
        ],
        "past_questions_categorized": {
            "aptitude": ["None. The focus is entirely on the Global Coding Test."],
            "coding": ["Implement custom Queue/Stack", "Find the shortest path in a grid with obstacles (BFS)", "Optimal resource allocation using Backtracking"],
            "technical": ["Explain deadlock prevention", "How does the Android OS manage memory?", "Differences between C and C++ memory management", "Explain your approach to the coding test problem."],
            "hr": ["Why Samsung?", "How do you handle high-pressure situations?", "Where do you see yourself in 3 years?"]
        },
        "bond": {
            "duration": "None",
            "penalty": "N/A",
            "details": ""
        },
        "training": {
            "duration": "1-2 months",
            "location": "Bangalore / Delhi / Noida",
            "stipend": "Full salary",
            "details": "Bootcamp on internal frameworks, Tizen, and advanced algorithms."
        },
        "work_locations": ["Bangalore (SRIB)", "Delhi (SRID)", "Noida (SRIN)"],
        "tech_stack": ["C", "C++", "Java", "Python", "Android SDK", "Tizen", "Machine Learning Frameworks"],
        "wfh_policy": "Hybrid.",
        "career_growth": [
            {"years": "0-3", "role": "Software Engineer", "salary_range": "14 - 20 LPA"},
            {"years": "3-7", "role": "Senior Software Engineer", "salary_range": "20 - 35 LPA"}
        ],
        "benefits": ["Premium Health Insurance", "Free Meals", "Product Discounts", "Relocation Allowance"],
        "bench_risk": "None"
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
