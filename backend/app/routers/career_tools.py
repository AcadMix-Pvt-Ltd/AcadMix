"""
Career Toolkit — AI-Powered Career Prep Tools Router (thin layer).

All business logic lives in app.services.career_service.
This router handles: HTTP interface, Pydantic validation, auth guards.
"""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List

from app.core.security import require_role
from app.services import career_service

router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════════════
# Request Schemas
# ═══════════════════════════════════════════════════════════════════════════════

class CoverLetterRequest(BaseModel):
    target_role: str = Field(..., min_length=2)
    company_name: Optional[str] = None
    job_description: Optional[str] = None
    resume_text: Optional[str] = None
    tone: str = Field(default="professional", pattern=r"^(professional|enthusiastic|concise)$")


class JDAnalyzeRequest(BaseModel):
    job_description: str = Field(..., min_length=50)
    resume_text: Optional[str] = None


class ColdEmailRequest(BaseModel):
    purpose: str = Field(..., pattern=r"^(referral|introduction|follow_up|thank_you)$")
    recipient_role: Optional[str] = None
    target_company: str = Field(..., min_length=2)
    target_role: str = Field(..., min_length=2)
    context: Optional[str] = None


class SkillGapRequest(BaseModel):
    target_role: str = Field(..., min_length=2)
    current_skills: Optional[List[str]] = None
    keywords_found: Optional[List[str]] = None
    keywords_missing: Optional[List[str]] = None


class HRQuestionsRequest(BaseModel):
    target_role: str = Field(..., min_length=2)
    question_count: int = Field(default=7, ge=3, le=12)
    company: Optional[str] = None
    difficulty: str = Field(default="intermediate", pattern=r"^(beginner|intermediate|advanced)$")


class DSARecommendRequest(BaseModel):
    target_company: Optional[str] = None
    difficulty: str = Field(default="medium", pattern=r"^(easy|medium|hard|mixed)$")
    focus_area: Optional[str] = None
    count: int = Field(default=10, ge=5, le=15)


class CareerPathRequest(BaseModel):
    current_skills: Optional[List[str]] = None
    target_role: Optional[str] = None
    interests: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# Endpoints (auth check → call service → return result)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/career/cover-letter")
async def generate_cover_letter(
    req: CoverLetterRequest,
    user: dict = Depends(require_role("student")),
):
    """Generate a tailored cover letter for a specific role and company."""
    return await career_service.generate_cover_letter(
        target_role=req.target_role,
        user_name=user.get("name", "Student"),
        company_name=req.company_name,
        job_description=req.job_description,
        resume_text=req.resume_text,
        tone=req.tone,
    )


@router.post("/career/jd-analyze")
async def analyze_job_description(
    req: JDAnalyzeRequest,
    user: dict = Depends(require_role("student")),
):
    """Analyze a job description to extract key requirements and insights."""
    return await career_service.analyze_job_description(
        job_description=req.job_description,
        resume_text=req.resume_text,
    )


@router.post("/career/cold-email")
async def draft_cold_email(
    req: ColdEmailRequest,
    user: dict = Depends(require_role("student")),
):
    """Generate a professional cold email or referral request."""
    return await career_service.draft_cold_email(
        purpose=req.purpose,
        target_company=req.target_company,
        target_role=req.target_role,
        user_name=user.get("name", "Student"),
        recipient_role=req.recipient_role,
        context=req.context,
    )


@router.post("/career/skill-gap")
async def analyze_skill_gap(
    req: SkillGapRequest,
    user: dict = Depends(require_role("student")),
):
    """Analyze skill gaps for a target role and suggest learning paths."""
    return await career_service.analyze_skill_gap(
        target_role=req.target_role,
        current_skills=req.current_skills,
        keywords_found=req.keywords_found,
        keywords_missing=req.keywords_missing,
    )


@router.post("/career/hr-questions")
async def generate_hr_questions(
    req: HRQuestionsRequest,
    user: dict = Depends(require_role("student")),
):
    """Generate HR/behavioral interview questions with model STAR answers."""
    return await career_service.generate_hr_questions(
        target_role=req.target_role,
        question_count=req.question_count,
        company=req.company,
        difficulty=req.difficulty,
    )


@router.post("/career/dsa-recommend")
async def recommend_dsa_problems(
    req: DSARecommendRequest,
    user: dict = Depends(require_role("student")),
):
    """Recommend curated DSA problems based on target company and difficulty."""
    return await career_service.recommend_dsa_problems(
        count=req.count,
        target_company=req.target_company,
        difficulty=req.difficulty,
        focus_area=req.focus_area,
    )


@router.post("/career/career-paths")
async def explore_career_paths(
    req: CareerPathRequest,
    user: dict = Depends(require_role("student")),
):
    """Explore career paths based on current skills and interests."""
    return await career_service.explore_career_paths(
        current_skills=req.current_skills,
        target_role=req.target_role,
        interests=req.interests,
    )


@router.get("/career/company-intel")
async def get_company_intel(
    branch: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    package_band: Optional[str] = Query(None),
    user: dict = Depends(require_role("student")),
):
    """Get company intel cards for common campus recruiters."""
    return career_service.get_company_intel(branch=branch, role=role, difficulty=difficulty, package_band=package_band)


@router.get("/career/resume/templates")
async def get_resume_templates(
    user: dict = Depends(require_role("student")),
):
    """Get premium resume template metadata for Resume Studio."""
    return career_service.get_resume_templates()
