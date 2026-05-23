"""hr payroll core

Revision ID: 7ab42e0f91d3
Revises: 6f2e9a1c4b80
Create Date: 2026-05-21

"""
from typing import Sequence, Union

from alembic import op

revision: str = "7ab42e0f91d3"
down_revision: Union[str, Sequence[str], None] = "6f2e9a1c4b80"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS staff_profiles (
            id VARCHAR PRIMARY KEY,
            college_id VARCHAR NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            employee_code VARCHAR NOT NULL,
            department VARCHAR,
            designation VARCHAR,
            employment_type VARCHAR NOT NULL DEFAULT 'full_time',
            joining_date DATE,
            bank_account VARCHAR,
            ifsc VARCHAR,
            pan VARCHAR,
            pf_number VARCHAR,
            esi_number VARCHAR,
            status VARCHAR NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT now(),
            is_deleted BOOLEAN NOT NULL DEFAULT false,
            deleted_at TIMESTAMPTZ,
            CONSTRAINT uq_staff_profile_user UNIQUE (college_id, user_id),
            CONSTRAINT uq_staff_profile_employee_code UNIQUE (college_id, employee_code)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_staff_profiles_college_id ON staff_profiles(college_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_staff_profiles_user_id ON staff_profiles(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_staff_profiles_employee_code ON staff_profiles(employee_code)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_staff_profiles_is_deleted ON staff_profiles(is_deleted)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS salary_structures (
            id VARCHAR PRIMARY KEY,
            college_id VARCHAR NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
            staff_id VARCHAR NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
            basic DOUBLE PRECISION NOT NULL DEFAULT 0,
            hra DOUBLE PRECISION NOT NULL DEFAULT 0,
            da DOUBLE PRECISION NOT NULL DEFAULT 0,
            allowances DOUBLE PRECISION NOT NULL DEFAULT 0,
            pf DOUBLE PRECISION NOT NULL DEFAULT 0,
            esi DOUBLE PRECISION NOT NULL DEFAULT 0,
            tds DOUBLE PRECISION NOT NULL DEFAULT 0,
            other_deductions DOUBLE PRECISION NOT NULL DEFAULT 0,
            effective_from DATE,
            status VARCHAR NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT now(),
            is_deleted BOOLEAN NOT NULL DEFAULT false,
            deleted_at TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_salary_structures_college_id ON salary_structures(college_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_salary_structures_staff_id ON salary_structures(staff_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_salary_structures_is_deleted ON salary_structures(is_deleted)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS payroll_runs (
            id VARCHAR PRIMARY KEY,
            college_id VARCHAR NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
            month VARCHAR NOT NULL,
            status VARCHAR NOT NULL DEFAULT 'draft',
            generated_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
            generated_at TIMESTAMPTZ DEFAULT now(),
            locked_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
            locked_at TIMESTAMPTZ,
            is_deleted BOOLEAN NOT NULL DEFAULT false,
            deleted_at TIMESTAMPTZ,
            CONSTRAINT uq_payroll_run_month UNIQUE (college_id, month)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_payroll_runs_college_id ON payroll_runs(college_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_payroll_runs_month ON payroll_runs(month)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_payroll_runs_is_deleted ON payroll_runs(is_deleted)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS payslips (
            id VARCHAR PRIMARY KEY,
            college_id VARCHAR NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
            run_id VARCHAR NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
            staff_id VARCHAR NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
            gross_pay DOUBLE PRECISION NOT NULL DEFAULT 0,
            deductions DOUBLE PRECISION NOT NULL DEFAULT 0,
            net_pay DOUBLE PRECISION NOT NULL DEFAULT 0,
            components JSONB NOT NULL DEFAULT '{}',
            status VARCHAR NOT NULL DEFAULT 'draft',
            created_at TIMESTAMPTZ DEFAULT now(),
            is_deleted BOOLEAN NOT NULL DEFAULT false,
            deleted_at TIMESTAMPTZ,
            CONSTRAINT uq_payslip_run_staff UNIQUE (run_id, staff_id)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_payslips_college_id ON payslips(college_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_payslips_run_id ON payslips(run_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_payslips_staff_id ON payslips(staff_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_payslips_is_deleted ON payslips(is_deleted)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS payslips")
    op.execute("DROP TABLE IF EXISTS payroll_runs")
    op.execute("DROP TABLE IF EXISTS salary_structures")
    op.execute("DROP TABLE IF EXISTS staff_profiles")
