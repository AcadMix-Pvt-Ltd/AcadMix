"""add batch to mv_attendance_by_dept

Revision ID: 92d33ab9de2c
Revises: 7ab42e0f91d3
Create Date: 2026-05-23 06:20:00.963567

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '92d33ab9de2c'
down_revision: Union[str, Sequence[str], None] = '7ab42e0f91d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_attendance_by_dept;")
    op.execute("""
    CREATE MATERIALIZED VIEW mv_attendance_by_dept AS
    SELECT ar.college_id,
        up.department,
        up.batch,
        count(*) AS total_records,
        count(*) FILTER (WHERE ((ar.status)::text = 'present'::text)) AS present_count,
        count(*) FILTER (WHERE ((ar.status)::text = 'absent'::text)) AS absent_count,
        count(*) FILTER (WHERE ((ar.status)::text = 'late'::text)) AS late_count,
        count(*) FILTER (WHERE ((ar.status)::text = ANY ((ARRAY['od'::character varying, 'medical'::character varying])::text[]))) AS excused_count,
        round((((count(*) FILTER (WHERE ((ar.status)::text = ANY ((ARRAY['present'::character varying, 'late'::character varying, 'od'::character varying, 'medical'::character varying])::text[]))))::numeric / (NULLIF(count(*), 0))::numeric) * (100)::numeric), 2) AS attendance_pct
    FROM attendance_records ar
    JOIN user_profiles up ON ar.student_id = up.user_id AND ar.college_id = up.college_id
    WHERE (NOT ar.is_deleted) AND (NOT up.is_deleted) AND (up.department IS NOT NULL)
    GROUP BY ar.college_id, up.department, up.batch;
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_attendance_by_dept;")
    op.execute("""
    CREATE MATERIALIZED VIEW mv_attendance_by_dept AS
    SELECT ar.college_id,
        up.department,
        count(*) AS total_records,
        count(*) FILTER (WHERE ((ar.status)::text = 'present'::text)) AS present_count,
        count(*) FILTER (WHERE ((ar.status)::text = 'absent'::text)) AS absent_count,
        count(*) FILTER (WHERE ((ar.status)::text = 'late'::text)) AS late_count,
        count(*) FILTER (WHERE ((ar.status)::text = ANY ((ARRAY['od'::character varying, 'medical'::character varying])::text[]))) AS excused_count,
        round((((count(*) FILTER (WHERE ((ar.status)::text = ANY ((ARRAY['present'::character varying, 'late'::character varying, 'od'::character varying, 'medical'::character varying])::text[]))))::numeric / (NULLIF(count(*), 0))::numeric) * (100)::numeric), 2) AS attendance_pct
    FROM attendance_records ar
    JOIN user_profiles up ON ar.student_id = up.user_id AND ar.college_id = up.college_id
    WHERE (NOT ar.is_deleted) AND (NOT up.is_deleted) AND (up.department IS NOT NULL)
    GROUP BY ar.college_id, up.department;
    """)
