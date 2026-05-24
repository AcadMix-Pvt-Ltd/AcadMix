from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, Index, UniqueConstraint, Date, Text, CheckConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func, text
import uuid
from database import Base
from app.models.core import SoftDeleteMixin

def generate_uuid():
    return str(uuid.uuid4())


# ── GAP 1: Program Specific Outcomes (PSO) ──────────────────────────────────


class ProgramSpecificOutcome(Base, SoftDeleteMixin):
    """
    College-defined program-specific outcomes, typically 3–5 per department.
    NBA requires CO→PSO attainment in addition to CO→PO.
    """
    __tablename__ = "program_specific_outcomes"
    id            = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id    = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    department_id = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    code          = Column(String, nullable=False)        # "PSO1", "PSO2", "PSO3"
    description   = Column(String, nullable=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("department_id", "code", name="uq_dept_pso_code"),
        Index("ix_pso_college_dept", "college_id", "department_id"),
    )


class COPSOMapping(Base, SoftDeleteMixin):
    """
    Matrix relationship between Course Outcomes and Program Specific Outcomes.
    Mirrors COPOMapping schema — strength 1 (Low), 2 (Medium), 3 (High).
    """
    __tablename__ = "co_pso_mappings"
    id        = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    co_id     = Column(String, ForeignKey("course_outcomes.id", ondelete="CASCADE"), nullable=False)
    pso_id    = Column(String, ForeignKey("program_specific_outcomes.id", ondelete="CASCADE"), nullable=False)
    strength  = Column(Integer, nullable=False)   # 1, 2, or 3
    rationale = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, server_default=text('true'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("co_id", "pso_id", name="uq_co_pso_mapping"),
    )


# ── GAP 2: Attainment Records ───────────────────────────────────────────────


class COAttainmentRecord(Base, SoftDeleteMixin):
    """
    Computed once per CO per course per academic year.
    Direct: from MarkSubmissionEntry.co_wise_marks (80% weight by default).
    Indirect: from CourseExitSurvey.co_ratings (20% weight by default).
    Weights are read from College.settings JSONB key "attainment_weights".
    This record is immutable once locked_at is set.
    """
    __tablename__ = "co_attainment_records"
    id                   = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id           = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    co_id                = Column(String, ForeignKey("course_outcomes.id", ondelete="CASCADE"), nullable=False)
    course_id            = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    academic_year        = Column(String, nullable=False)
    semester             = Column(Integer, nullable=False)
    direct_attainment    = Column(Float, nullable=True)   # % from marks
    indirect_attainment  = Column(Float, nullable=True)   # % from exit survey
    final_attainment     = Column(Float, nullable=True)   # weighted composite
    threshold            = Column(Float, nullable=False, server_default=text('60.0'))
    is_attained          = Column(Boolean, nullable=True) # True if final_attainment >= threshold
    calculation_snapshot = Column(JSONB, nullable=True)   # full breakdown for audit trail
    locked_at            = Column(DateTime(timezone=True), nullable=True)
    locked_by            = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        UniqueConstraint("co_id", "course_id", "academic_year", name="uq_co_attainment"),
        Index("ix_co_attainment_college_year", "college_id", "academic_year"),
    )


class POAttainmentRecord(Base, SoftDeleteMixin):
    """
    Computed per PO per department per academic year.
    Formula: avg(CO attainments × COPOMapping.strength) across all courses in the program.
    """
    __tablename__ = "po_attainment_records"
    id                 = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id         = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    po_id              = Column(String, ForeignKey("program_outcomes.id", ondelete="CASCADE"), nullable=False)
    department_id      = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    academic_year      = Column(String, nullable=False)
    attainment_value   = Column(Float, nullable=True)
    calculation_method = Column(JSONB, nullable=True)  # {co_id: {weight: 3, attainment: 72.4}, ...}
    locked_at          = Column(DateTime(timezone=True), nullable=True)
    locked_by          = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        UniqueConstraint("po_id", "department_id", "academic_year", name="uq_po_attainment"),
        Index("ix_po_attainment_college_year", "college_id", "academic_year"),
    )


class PSOAttainmentRecord(Base, SoftDeleteMixin):
    """Same calculation as POAttainmentRecord but against COPSOMapping."""
    __tablename__ = "pso_attainment_records"
    id               = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id       = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    pso_id           = Column(String, ForeignKey("program_specific_outcomes.id", ondelete="CASCADE"), nullable=False)
    department_id    = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    academic_year    = Column(String, nullable=False)
    attainment_value = Column(Float, nullable=True)
    calculation_method = Column(JSONB, nullable=True)
    locked_at        = Column(DateTime(timezone=True), nullable=True)
    locked_by        = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        UniqueConstraint("pso_id", "department_id", "academic_year", name="uq_pso_attainment"),
    )


# ── GAP 5: Course Exit Survey (Indirect Attainment Source) ─────────────────


class CourseExitSurvey(Base, SoftDeleteMixin):
    """
    Student self-assessment of CO achievement at course end.
    Feeds indirectly into COAttainmentRecord.indirect_attainment.
    One record per (course, student, academic_year) — enforced by unique constraint.
    """
    __tablename__ = "course_exit_surveys"
    id             = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id     = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id      = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id     = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    academic_year  = Column(String, nullable=False)
    co_ratings     = Column(JSONB, nullable=False)   # {"co-uuid-1": 4, "co-uuid-2": 3} (1-5 scale)
    overall_rating = Column(Integer, nullable=True)
    submitted_at   = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("course_id", "student_id", "academic_year", name="uq_exit_survey"),
        Index("ix_exit_survey_course_year", "course_id", "academic_year"),
    )

class StudentSatisfactionSurvey(Base, SoftDeleteMixin):
    """
    NAAC Criterion 2.7.1: Student Satisfaction Survey (SSS).
    Captures general institutional feedback.
    """
    __tablename__ = "student_satisfaction_surveys"
    id             = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id     = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id     = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    academic_year  = Column(String, nullable=False)
    responses      = Column(JSONB, nullable=False)   # NAAC SSS 21 Questionnaire (Q1-Q20 scored 0-4, Q21 text)
    submitted_at   = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("student_id", "academic_year", name="uq_sss"),
        Index("ix_sss_college_year", "college_id", "academic_year"),
    )


# ── GAP 6: Faculty Profile & Achievement ───────────────────────────────────


class FacultyProfile(Base, SoftDeleteMixin):
    """
    One record per faculty member. Populated by faculty self-entry, verified by HOD.
    Feeds NAAC Criterion 3.1 (Faculty Quality) directly.
    """
    __tablename__ = "faculty_profiles"
    id               = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id       = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id       = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    qualification    = Column(String, nullable=True)    # PhD, MTech, ME, MSc
    specialization   = Column(String, nullable=True)
    experience_years = Column(Integer, nullable=True)
    joining_date     = Column(Date, nullable=True)
    designation      = Column(String, nullable=True)    # Professor, Associate Professor, Assistant Professor
    h_index          = Column(Integer, nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_faculty_profile_college", "college_id"),
    )


class FacultyAchievement(Base, SoftDeleteMixin):
    """
    One record per achievement. Multiple per faculty.
    type enum drives what additional fields are relevant.
    """
    __tablename__ = "faculty_achievements"
    id            = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id    = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type          = Column(
        SAEnum(
            "FDP", "Workshop", "Publication", "Patent",
            "Award", "Consultancy", "STTP", "Conference",
            name="faculty_achievement_type_enum",
        ),
        nullable=False,
    )
    title         = Column(String, nullable=False)
    date          = Column(Date, nullable=False)
    issuer        = Column(String, nullable=True)        # Journal name, patent office, etc.
    impact_factor = Column(Float, nullable=True)         # For publications only
    is_verified   = Column(Boolean, nullable=False, server_default=text('false'))
    # HOD sets True after document verification
    evidence_url  = Column(String, nullable=True)        # S3 URL to certificate/paper
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_faculty_achievement_college_faculty", "college_id", "faculty_id"),
    )


# ── GAP 9: NAAC Audit Infrastructure ───────────────────────────────────────


class AccreditationEvidence(Base, SoftDeleteMixin):
    """
    Every document uploaded to support a NAAC/NBA criterion metric.
    hash_checksum ensures tampering is detectable in future audits.
    """
    __tablename__ = "accreditation_evidence"
    id            = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id    = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    criterion_id  = Column(String, nullable=False)       # "1.1.1", "3.5.2", "NBA-C3"
    file_name     = Column(String, nullable=False)
    s3_key        = Column(String, nullable=False)
    hash_checksum = Column(String, nullable=False)       # SHA-256 of file at upload time
    uploaded_by   = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_accreditation_evidence_college_criterion", "college_id", "criterion_id"),
    )


class NAACAuditSnapshot(Base, SoftDeleteMixin):
    """
    Frozen year-end record of a single NAAC metric's computed value.
    IMMUTABILITY RULE: once locked_at is set, the service layer must reject
    any UPDATE to computed_value or evidence_ids on this record.
    This is enforced in the service layer, not via DB trigger.
    """
    __tablename__ = "naac_audit_snapshots"
    id             = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id     = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year  = Column(String, nullable=False)
    criterion      = Column(Integer, nullable=False)      # 1 through 7
    metric_code    = Column(String, nullable=False)        # "2.1.1", "3.4.2"
    computed_value = Column(Float, nullable=True)
    evidence_ids   = Column(JSONB, nullable=True)          # list of AccreditationEvidence UUIDs
    locked_at      = Column(DateTime(timezone=True), nullable=True)
    locked_by      = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("college_id", "academic_year", "metric_code", name="uq_naac_snapshot"),
        CheckConstraint("criterion >= 1 AND criterion <= 7", name="ck_criterion_range"),
        Index("ix_naac_snapshot_college_year", "college_id", "academic_year"),
    )


# ── GAP 10: Validation Layer & Report Generation ───────────────────────────


class NAACQualitativeNarrative(Base, SoftDeleteMixin):
    """
    Stores 500-word qualitative narratives (QlM) for NAAC criteria.
    Decoupled from numerical snapshots to allow iterative drafting and versioning.
    """
    __tablename__ = "naac_qualitative_narratives"
    id             = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id     = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year  = Column(String, nullable=False)
    criterion_code = Column(String, nullable=False)       # e.g., "2.1.1"
    criterion_name = Column(String, nullable=False)       # e.g., "Student Enrollment - Demand Ratio"
    narrative_text = Column(Text, nullable=True)          # Markdown format
    last_edited_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    last_edited_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())
    is_complete    = Column(Boolean, nullable=False, server_default=text('false'))
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("college_id", "academic_year", "criterion_code", name="uq_naac_qlm"),
        Index("ix_naac_qlm_college_year", "college_id", "academic_year"),
    )


class AttainmentConfig(Base, SoftDeleteMixin):
    """
    Overrides for NBA attainment calculation logic (thresholds, weights) 
    at the institution or department level for a specific batch/academic year.
    """
    __tablename__ = "attainment_configs"
    id                   = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id           = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    department_id        = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=True) # Null = institution wide
    batch_year           = Column(String, nullable=False)
    direct_threshold_pct = Column(Float, nullable=False, server_default=text('60.0'))
    direct_weight        = Column(Float, nullable=False, server_default=text('0.80'))
    indirect_weight      = Column(Float, nullable=False, server_default=text('0.20'))
    po_target_level      = Column(Float, nullable=False, server_default=text('2.5')) # Target on a 3-point scale
    created_at           = Column(DateTime(timezone=True), server_default=func.now())
    updated_at           = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())

    __table_args__ = (
        Index("ix_attainment_cfg_college_dept_batch", "college_id", "department_id", "batch_year"),
    )


class AccreditationReportJob(Base, SoftDeleteMixin):
    """
    Tracks background report generation tasks (ARQ) and provides versioning 
    for exported reports across the academic cycle.
    """
    __tablename__ = "accreditation_report_jobs"
    id             = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id     = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    report_type    = Column(String, nullable=False)        # "NAAC", "NBA", "NEP"
    academic_year  = Column(String, nullable=False)
    version        = Column(Integer, nullable=False, server_default=text('1'))
    status         = Column(String, nullable=False, server_default=text("'PENDING'")) # PENDING, PROCESSING, COMPLETED, FAILED
    arq_job_id     = Column(String, nullable=True)
    presigned_url  = Column(String, nullable=True)         # S3/R2 download URL
    expires_at     = Column(DateTime(timezone=True), nullable=True)
    created_by     = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("college_id", "report_type", "academic_year", "version", name="uq_report_job_version"),
        Index("ix_report_job_college_type", "college_id", "report_type"),
    )


# ── GAP 11: Survey & Feedback Engine ───────────────────────────────────────


class SurveyTemplate(Base, SoftDeleteMixin):
    __tablename__ = "survey_templates"
    id             = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id     = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    title          = Column(String, nullable=False)
    description    = Column(Text, nullable=True)
    survey_type    = Column(String, nullable=False)        # "ALUMNI", "EMPLOYER", "FACULTY", "STUDENT", "EXIT"
    academic_year  = Column(String, nullable=False)
    is_published   = Column(Boolean, nullable=False, server_default=text('false'))
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

class SurveyQuestion(Base, SoftDeleteMixin):
    __tablename__ = "survey_questions"
    id             = Column(String, primary_key=True, index=True, default=generate_uuid)
    template_id    = Column(String, ForeignKey("survey_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    question_text  = Column(Text, nullable=False)
    question_type  = Column(String, nullable=False)        # "TEXT", "RATING", "MULTIPLE_CHOICE"
    options        = Column(JSONB, nullable=True)          # List of choices if applicable
    order_index    = Column(Integer, nullable=False, server_default=text('0'))

class SurveyResponse(Base, SoftDeleteMixin):
    __tablename__ = "survey_responses"
    id             = Column(String, primary_key=True, index=True, default=generate_uuid)
    template_id    = Column(String, ForeignKey("survey_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id        = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True) # Optional for anonymous
    answers        = Column(JSONB, nullable=False)         # Dict mapping question_id -> answer
    submitted_at   = Column(DateTime(timezone=True), server_default=func.now())


# ── GAP 12: Placement & Progression Tracker ─────────────────────────────────

class PlacementRecord(Base, SoftDeleteMixin):
    __tablename__ = "placement_records"
    id             = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id     = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id     = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year  = Column(String, nullable=False)        # Year of placement
    company_name   = Column(String, nullable=False)
    package        = Column(Float, nullable=True)          # LPA or similar
    offer_letter_url= Column(String, nullable=True)        # Proof for NAAC
    placed_on      = Column(Date, nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

class HigherEducationRecord(Base, SoftDeleteMixin):
    __tablename__ = "higher_education_records"
    id             = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id     = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id     = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year  = Column(String, nullable=False)        # Year of graduation
    institution_name= Column(String, nullable=False)
    program_name   = Column(String, nullable=False)        # M.Tech, MS, MBA
    admission_proof= Column(String, nullable=True)         # Proof for NAAC
    admitted_on    = Column(Date, nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())


# ── GAP 13: Infrastructure & Financial Resources ────────────────────────────
# (InfrastructureExpenditure is defined in app.models.infrastructure)

# ── GAP 14: Research & Professional Practice (RPII) ─────────────────────────

class ResearchOrganization(Base, SoftDeleteMixin):
    """
    Tracks Funding Agencies and Client Organizations for Sponsored Research and Consultancy.
    """
    __tablename__ = "research_organizations"
    id             = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id     = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    name           = Column(String, nullable=False)
    org_type       = Column(String, nullable=False)        # "FUNDING_AGENCY", "CLIENT", "PARTNER"
    created_at     = Column(DateTime(timezone=True), server_default=func.now())


class PatentRecord(Base, SoftDeleteMixin):
    __tablename__ = "patent_records"
    id             = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id     = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id     = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title          = Column(String, nullable=False)
    calendar_year  = Column(Integer, nullable=False)       # NIRF tracks by Calendar year
    status         = Column(String, nullable=False)        # "PUBLISHED", "GRANTED"
    created_at     = Column(DateTime(timezone=True), server_default=func.now())


class SponsoredResearchRecord(Base, SoftDeleteMixin):
    __tablename__ = "sponsored_research_records"
    id               = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id       = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id       = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    org_id           = Column(String, ForeignKey("research_organizations.id", ondelete="CASCADE"), nullable=False)
    academic_year    = Column(String, nullable=False)
    title            = Column(String, nullable=False)
    amount_received  = Column(Float, nullable=False, server_default=text('0.0'))
    created_at       = Column(DateTime(timezone=True), server_default=func.now())


class ConsultancyRecord(Base, SoftDeleteMixin):
    __tablename__ = "consultancy_records"
    id               = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id       = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id       = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    org_id           = Column(String, ForeignKey("research_organizations.id", ondelete="CASCADE"), nullable=False)
    academic_year    = Column(String, nullable=False)
    title            = Column(String, nullable=False)
    amount_received  = Column(Float, nullable=False, server_default=text('0.0'))
    created_at       = Column(DateTime(timezone=True), server_default=func.now())


class ExecutiveDevelopmentProgram(Base, SoftDeleteMixin):
    __tablename__ = "executive_development_programs"
    id               = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id       = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year    = Column(String, nullable=False)
    title            = Column(String, nullable=False)
    participants     = Column(Integer, nullable=False, server_default=text('0'))
    annual_earnings  = Column(Float, nullable=False, server_default=text('0.0'))
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
