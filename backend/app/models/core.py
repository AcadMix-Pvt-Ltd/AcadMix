from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, Index, UniqueConstraint, Date, CheckConstraint, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func, text
import uuid
from database import Base

def generate_uuid():
    return str(uuid.uuid4())


class SoftDeleteMixin:
    is_deleted = Column(Boolean, nullable=False, server_default=text('false'), index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)


class College(Base, SoftDeleteMixin):
    """
    settings JSONB shape:
    {
      "grade_scale": [
        {"min_pct": 90, "grade": "O", "points": 10},
        {"min_pct": 80, "grade": "A+", "points": 9},
        ...
        {"min_pct": 0, "grade": "F", "points": 0}
      ]
    }
    """
    __tablename__ = "colleges"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    name = Column(String, nullable=False)
    domain = Column(String, nullable=True)
    settings = Column(JSONB, nullable=False, server_default='{}')
    group_id = Column(String, ForeignKey("college_groups.id"), nullable=True)
    campus_id = Column(String, ForeignKey("campuses.id"), nullable=True)
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Department(Base, SoftDeleteMixin):
    __tablename__ = "departments"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    hod_user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class Program(Base, SoftDeleteMixin):
    __tablename__ = "programs"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False) # e.g. "B.Tech", "M.Tech", "MBA"
    duration_years = Column(Integer, nullable=True)
    head_user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class Section(Base, SoftDeleteMixin):
    __tablename__ = "sections"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    program_id = Column(String, ForeignKey("programs.id", ondelete="CASCADE"), nullable=True)
    name = Column(String, nullable=False)
    intake = Column(Integer, nullable=True)


class Role(Base, SoftDeleteMixin):
    __tablename__ = "roles"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    permissions = Column(JSONB, nullable=False, server_default='{}')


class User(Base, SoftDeleteMixin):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    sso_provider = Column(String, nullable=True) # e.g. "google", "azure"
    sso_id = Column(String, nullable=True) # The unique external ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # GDPR Right to Erasure
    is_anonymized = Column(Boolean, nullable=False, server_default=text('false'))
    anonymized_at = Column(DateTime(timezone=True), nullable=True)

    profile = relationship("UserProfile", back_populates="user", lazy="joined", uselist=False)

    @property
    def profile_data(self):
        if self.profile:
            data = {
                "department": self.profile.department,
                "section": self.profile.section,
                "batch": self.profile.batch,
                "current_semester": self.profile.current_semester,
                "phone": self.profile.phone,
                "blood_group": self.profile.blood_group,
                "telemetry_strikes": self.profile.telemetry_strikes,
                "acad_tokens": self.profile.acad_tokens,
                "college_id": self.profile.college_id,
                "roll_number": self.profile.roll_number,
                "force_password_change": self.profile.force_password_change,
                # Personal Details
                "date_of_birth": self.profile.date_of_birth.isoformat() if self.profile.date_of_birth else None,
                "dob": self.profile.date_of_birth.isoformat() if self.profile.date_of_birth else None,
                "gender": self.profile.gender,
                "aadhaar_number": self.profile.aadhaar_number,
                "aadhaar": self.profile.aadhaar_number,
                "father_name": self.profile.father_name,
                "mother_name": self.profile.mother_name,
                "address": self.profile.address,
                # NEP Compliance
                "abc_id": self.profile.abc_id,
                "enrollment_status": self.profile.enrollment_status,
            }
            # Merge extra_data JSONB (parent_phone, community, religion, etc.)
            if self.profile.extra_data and isinstance(self.profile.extra_data, dict):
                for k, v in self.profile.extra_data.items():
                    if k not in data:
                        data[k] = v
            return data
        return {}

class UserProfile(Base, SoftDeleteMixin):
    __tablename__ = "user_profiles"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    roll_number = Column(String, nullable=True, index=True)
    
    department = Column(String, nullable=True)
    program_id = Column(String, ForeignKey("programs.id", ondelete="SET NULL"), nullable=True)
    section = Column(String, nullable=True)
    batch = Column(String, nullable=True)
    current_semester = Column(Integer, nullable=True)
    
    force_password_change = Column(Boolean, nullable=False, server_default=text('false'))
    
    phone = Column(String, nullable=True)
    blood_group = Column(String, nullable=True)

    # ── Personal Details ──────────────────────────────────────────────
    date_of_birth   = Column(Date, nullable=True)
    gender          = Column(String(10), nullable=True)
    aadhaar_number  = Column(String(12), nullable=True)
    father_name     = Column(String(200), nullable=True)
    mother_name     = Column(String(200), nullable=True)
    address         = Column(Text, nullable=True)
    
    telemetry_strikes = Column(Integer, nullable=False, server_default=text('0'))
    acad_tokens = Column(Float, nullable=False, server_default=text('0.0'))
    extra_data = Column(JSONB, nullable=True, server_default='{}')  # Extensible: notification_preferences, entitlements, etc.

    # ── Gamification ─────────────────────────────────────────────────────────
    xp_points = Column(Integer, nullable=False, server_default=text('0'))
    current_streak = Column(Integer, nullable=False, server_default=text('0'))
    longest_streak = Column(Integer, nullable=False, server_default=text('0'))
    last_active_date = Column(Date, nullable=True)

    # ── NEP Compliance Fields (Student-Only) ─────────────────────────
    # These fields are ONLY meaningful when user.role == "student".
    # The service layer MUST enforce this constraint — never populate
    # or expose abc_id / enrollment_status for faculty, HOD, admin,
    # or any non-student role. They remain NULL for all other roles.
    abc_id            = Column(String, unique=True, index=True, nullable=True)
    enrollment_status = Column(String, nullable=False, server_default="active")
    # Valid values: active | academic_break | dropped_out | graduated
    # academic_break = NEP's multiple entry/exit mechanism

    user = relationship("User", back_populates="profile")

class UserPermission(Base, SoftDeleteMixin):
    """Admin-configurable permission flags per user. Separate from role.
    The `flags` JSONB column stores boolean/value gates set by admin:
      e.g. { "can_create_timetable": true, "is_subject_expert": false, ... }
    """
    __tablename__ = "user_permissions"
    id         = Column(String, primary_key=True, index=True, default=generate_uuid)
    user_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    flags      = Column(JSONB, nullable=False, server_default='{}')
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("ix_user_permissions_user_college", "user_id", "college_id"),
    )

# ─── Phase 1: CIA Template Engine ────────────────────────────────────────────


class ParentStudentLink(Base, SoftDeleteMixin):
    """Many-to-many parent–student link with relationship metadata."""
    __tablename__ = "parent_student_links"
    id           = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id   = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id   = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship = Column(String, nullable=False)  # father/mother/guardian
    is_primary   = Column(Boolean, nullable=False, server_default=text('false'))
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("parent_id", "student_id", name="uq_parent_student"),
    )


class PinnedInsight(Base, SoftDeleteMixin):
    """Pinned NL queries that Principals/HODs keep on their dashboard."""
    __tablename__ = "pinned_insights"
    id               = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id       = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id          = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role             = Column(String, nullable=False, server_default='PRINCIPAL')
    title            = Column(String, nullable=False)
    nl_query         = Column(Text, nullable=False)
    cached_sql       = Column(Text, nullable=False)
    chart_suggestion = Column(String, nullable=True) # e.g. bar_chart
    created_at       = Column(DateTime(timezone=True), server_default=func.now())


class CollegeModule(Base, SoftDeleteMixin):
    __tablename__ = "college_modules"
    id               = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id       = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    module_name      = Column(String, nullable=False)
    is_enabled       = Column(Boolean, nullable=False, server_default=text('false'))
    student_visible  = Column(Boolean, nullable=False, server_default=text('false'))
    visible_to_roles = Column(JSONB, nullable=False, server_default=text('\'["student"]\''))
    enabled_by       = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    conditions       = Column(JSONB, nullable=True)

    __table_args__ = (
        UniqueConstraint("college_id", "module_name", name="uq_college_module"),
    )


class MoodCheckin(Base, SoftDeleteMixin):
    """Tracks daily student mental health and burnout levels."""
    __tablename__ = "mood_checkins"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mood_score = Column(Integer, nullable=False) # 1 to 5 (1=Terrible, 5=Great)
    energy_score = Column(Integer, nullable=False) # 1 to 5 (1=Exhausted, 5=Energized)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_mood_student", "student_id", "created_at"),
    )
