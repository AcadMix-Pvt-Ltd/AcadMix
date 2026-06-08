"""
Interview War Room — Database Models
AI Mock Interviews & ATS Resume Scoring for placement preparation.
"""
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Text, Boolean, Index
from sqlalchemy.sql import text as sa_text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base
from app.models.core import SoftDeleteMixin


def generate_uuid():
    return str(uuid.uuid4())


class MockInterview(Base, SoftDeleteMixin):
    """Tracks each AI mock interview session with full conversation history and scoring."""
    __tablename__ = "mock_interviews"

    id               = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id       = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id       = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    interview_type   = Column(String, nullable=False)                                    # technical/hr/behavioral/mixed/company_specific
    target_role      = Column(String, nullable=True)                                     # SDE, Data Analyst, etc.
    target_company   = Column(String, nullable=True)                                     # TCS, Infosys, Google (nullable)
    difficulty       = Column(String, nullable=False, server_default='intermediate')      # beginner/intermediate/advanced
    resume_context   = Column(Text, nullable=True)                                       # Parsed resume text used as context
    conversation     = Column(JSONB, nullable=False, server_default='[]')                 # [{role, content, timestamp, score}]
    ai_feedback      = Column(JSONB, nullable=True)                                      # Comprehensive post-interview feedback
    scores           = Column(JSONB, nullable=True)                                      # {overall, technical, communication, ...}
    overall_score    = Column(Float, nullable=True)                                      # 0-100 composite
    question_count   = Column(Integer, nullable=False, default=0)
    duration_seconds = Column(Integer, nullable=True)
    status           = Column(String, nullable=False, server_default='in_progress')       # in_progress/completed/abandoned
    current_student_code = Column(Text, nullable=True)
    current_student_language = Column(String, nullable=True, server_default='python')
    whiteboard_description = Column(Text, nullable=True)
    current_stage    = Column(String, nullable=False, server_default='icebreaker')
    assembly_ai_job_id = Column(String, nullable=True, index=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    completed_at     = Column(DateTime(timezone=True), nullable=True)

    messages = relationship("MockInterviewMessage", back_populates="interview", cascade="all, delete-orphan")


class MockInterviewMessage(Base, SoftDeleteMixin):
    """Stores individual conversation turns of a mock interview (normalized table)."""
    __tablename__ = "mock_interview_messages"

    id           = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id   = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id   = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    interview_id = Column(String, ForeignKey("mock_interviews.id", ondelete="CASCADE"), nullable=False, index=True)
    
    role         = Column(String, nullable=False)                        # assistant / user
    content      = Column(Text, nullable=False)                          # message text
    timestamp    = Column(String, nullable=True)                          # ISO string
    source       = Column(String, nullable=False, server_default='http')  # livekit / http
    kind         = Column(String, nullable=False, server_default='question') # question / answer / nudge / clarification
    q_number     = Column(Integer, nullable=True)                        # sequence count
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    interview = relationship("MockInterview", back_populates="messages")


class ResumeScore(Base, SoftDeleteMixin):
    """ATS resume analysis results — PDF is parsed in-memory and discarded, only text is stored."""
    __tablename__ = "resume_scores"

    id               = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id       = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id       = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename         = Column(String, nullable=False)                                    # Original upload filename
    parsed_text      = Column(Text, nullable=True)                                       # Extracted text from PDF
    ats_score        = Column(Float, nullable=True)                                      # 0-100 ATS compatibility score
    section_scores   = Column(JSONB, nullable=True)                                      # {contact: 90, experience: 70, ...}
    keywords_found   = Column(JSONB, nullable=True)                                      # Matched industry keywords
    keywords_missing = Column(JSONB, nullable=True)                                      # Suggested missing keywords
    improvement_tips = Column(JSONB, nullable=True)                                      # AI-generated suggestions
    target_role      = Column(String, nullable=True)                                     # Role the resume was scored against
    job_description  = Column(Text, nullable=True)                                       # Optional JD for precise matching
    created_at       = Column(DateTime(timezone=True), server_default=func.now())


class StudentResume(Base, SoftDeleteMixin):
    """Persistent resume vault — stores actual file in R2, parsed text for ATS."""
    __tablename__ = "student_resumes"

    id           = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id   = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id   = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename     = Column(String, nullable=False)                   # Original filename (e.g. "Aarav_Resume_v3.pdf")
    storage_key  = Column(String, nullable=False)                   # R2 object key
    file_url     = Column(String, nullable=False)                   # Public/presigned URL
    content_type = Column(String, nullable=False, default="application/pdf")
    file_size    = Column(Integer, nullable=True)                   # bytes
    parsed_text  = Column(Text, nullable=True)                      # Extracted text for ATS/job matching
    is_primary   = Column(Boolean, nullable=False, server_default=sa_text('false'))  # Default resume for one-click apply
    version      = Column(Integer, nullable=False, default=1)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_student_resume_primary", "student_id", "is_primary", unique=False),
    )


class PlacementRestriction(Base, SoftDeleteMixin):
    """TPO-managed student placement restrictions (global or per-drive bans)."""
    __tablename__ = "placement_restrictions"

    id               = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id       = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id       = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    drive_id         = Column(String, ForeignKey("placement_drives.id", ondelete="CASCADE"), nullable=True)  # NULL = global
    reason           = Column(String, nullable=False)
    restricted_by    = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    restriction_type = Column(String, nullable=False, default="blocked")  # blocked / warning
    is_active        = Column(Boolean, nullable=False, server_default=sa_text('true'))
    expires_at       = Column(DateTime(timezone=True), nullable=True)     # NULL = permanent
    created_at       = Column(DateTime(timezone=True), server_default=func.now())


class CompanyQuestionBank(Base, SoftDeleteMixin):
    """Company-specific mass-recruiter test patterns (e.g. TCS NQT, Infosys HackWithInfy)."""
    __tablename__ = "company_question_banks"

    id             = Column(String, primary_key=True, index=True, default=generate_uuid)
    company_name   = Column(String, index=True, nullable=False)                         # 'TCS', 'Infosys', 'Amazon'
    exam_name      = Column(String, nullable=False)                                     # 'TCS NQT', 'HackWithInfy'
    exam_pattern   = Column(JSONB, nullable=False)                                      # {"sections": ["Numerical", "Verbal"], "total_questions": 26, "duration_minutes": 60}
    questions      = Column(JSONB, nullable=False, server_default='[]')                 # Array of question dicts
    created_at     = Column(DateTime(timezone=True), server_default=func.now())


class AptitudeQuestion(Base, SoftDeleteMixin):
    """Quantitative, Logical, and Verbal reasoning database.
    college_id NULL = platform-curated content (visible to all tenants).
    college_id set  = college-specific content (tenant-scoped).
    """
    __tablename__ = "aptitude_questions"

    id             = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id     = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)  # NULL = platform
    category       = Column(String, index=True, nullable=False)                         # Quantitative / Logical / Verbal
    subcategory    = Column(String, nullable=True)                                      # Time & Work, Puzzles, Grammar
    difficulty     = Column(String, nullable=False, server_default='medium')            # easy/medium/hard
    question_text  = Column(Text, nullable=False)
    options        = Column(JSONB, nullable=False)                                      # {"A": "val", "B": "val2", ...}
    correct_option = Column(String, nullable=False)                                     # "A"
    explanation    = Column(Text, nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())


class CompanyInterviewExperience(Base, SoftDeleteMixin):
    """Curated, read-only interview records from past years.
    college_id NULL = global community content (visible to all tenants).
    college_id set  = college-specific content (per college permission).
    """
    __tablename__ = "company_interview_experiences"

    id               = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id       = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)  # NULL = global community
    company_name     = Column(String, index=True, nullable=False)
    target_role      = Column(String, index=True, nullable=False)                       # SDE-1, Data Analyst
    year             = Column(Integer, nullable=False)
    difficulty_rating= Column(Integer, nullable=True)                                   # 1-5 scale
    rounds           = Column(JSONB, nullable=False, server_default='[]')               # [{"round": 1, "type": "OA", "details": "..."}]
    created_at       = Column(DateTime(timezone=True), server_default=func.now())


class SQLProblem(Base, SoftDeleteMixin):
    """DataLemur-style SQL Practice challenges.
    college_id NULL = platform-curated content (visible to all tenants).
    college_id set  = college-specific content (tenant-scoped).
    """
    __tablename__ = "sql_problems"

    id               = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id       = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)  # NULL = platform
    title            = Column(String, nullable=False)
    dataset_theme    = Column(String, nullable=False)                                   # E-commerce, HR, Social Media
    company_tag      = Column(String, nullable=True)                                    # 'Amazon'
    difficulty       = Column(String, nullable=False, server_default='medium')          # easy/medium/hard
    problem_statement= Column(Text, nullable=False)
    schema_sql       = Column(Text, nullable=False)                                     # CREATE TABLE ... INSERT INTO ...
    hint             = Column(Text, nullable=True)
    expected_query   = Column(Text, nullable=False)                                     # Server-side validation logic
    expected_output  = Column(JSONB, nullable=False)                                    # JSON array format of output rows
    # ── New DataLemur-style fields ──
    tables_meta      = Column(JSONB, nullable=True)                                     # [{name, columns:[{name,type}], sample_input:[[val,...]]}]
    example_output   = Column(JSONB, nullable=True)                                     # [{col: val, ...}] display-only example
    explanation      = Column(Text, nullable=True)                                      # Walkthrough text
    solution_sql     = Column(Text, nullable=True)                                      # Revealed solution query
    created_at       = Column(DateTime(timezone=True), server_default=func.now())


class PlacementAttemptTracker(Base, SoftDeleteMixin):
    """Aggregates all placement practice stats to power the TPO Accreditation Dashboard"""
    __tablename__ = "placement_attempt_trackers"

    id               = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id       = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id       = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    module_type      = Column(String, nullable=False)                                   # 'aptitude', 'sql', 'company_bank'
    reference_id     = Column(String, nullable=False)                                   # Question ID / SQL ID
    is_correct       = Column(Boolean, nullable=False)
    time_taken_sec   = Column(Integer, nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
