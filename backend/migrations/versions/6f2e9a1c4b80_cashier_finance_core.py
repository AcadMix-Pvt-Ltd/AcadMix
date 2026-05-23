"""cashier finance core

Revision ID: 6f2e9a1c4b80
Revises: 34c25dbeb571
Create Date: 2026-05-20

"""
from typing import Sequence, Union

from alembic import op

revision: str = "6f2e9a1c4b80"
down_revision: Union[str, Sequence[str], None] = "34c25dbeb571"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE student_fee_invoices ADD COLUMN IF NOT EXISTS invoice_no VARCHAR")
    op.execute("ALTER TABLE student_fee_invoices ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'unpaid'")
    op.execute("ALTER TABLE student_fee_invoices ADD COLUMN IF NOT EXISTS created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL")
    op.execute("ALTER TABLE student_fee_invoices ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR REFERENCES users(id) ON DELETE SET NULL")
    op.execute("ALTER TABLE student_fee_invoices ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ")
    op.execute("CREATE INDEX IF NOT EXISTS ix_student_fee_invoices_invoice_no ON student_fee_invoices(invoice_no)")

    op.execute("ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS receipt_no VARCHAR")
    op.execute("ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS payment_mode VARCHAR NOT NULL DEFAULT 'razorpay'")
    op.execute("ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS collected_by VARCHAR REFERENCES users(id) ON DELETE SET NULL")
    op.execute("ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS cashier_session_id VARCHAR")
    op.execute("ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS verification_token VARCHAR")
    op.execute("ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS remarks TEXT")
    op.execute("ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS received_from VARCHAR")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fee_payments_receipt_no ON fee_payments(receipt_no)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fee_payments_verification_token ON fee_payments(verification_token)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS cashier_sessions (
            id VARCHAR PRIMARY KEY,
            college_id VARCHAR NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
            cashier_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            opened_at TIMESTAMPTZ DEFAULT now(),
            closed_at TIMESTAMPTZ,
            opening_cash DOUBLE PRECISION NOT NULL DEFAULT 0,
            expected_cash DOUBLE PRECISION NOT NULL DEFAULT 0,
            actual_cash DOUBLE PRECISION,
            status VARCHAR NOT NULL DEFAULT 'open',
            notes TEXT,
            is_deleted BOOLEAN NOT NULL DEFAULT false,
            deleted_at TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_cashier_sessions_college_id ON cashier_sessions(college_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_cashier_sessions_cashier_id ON cashier_sessions(cashier_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_cashier_sessions_is_deleted ON cashier_sessions(is_deleted)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS fee_structures (
            id VARCHAR PRIMARY KEY,
            college_id VARCHAR NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
            name VARCHAR NOT NULL,
            academic_year VARCHAR NOT NULL,
            program_id VARCHAR REFERENCES programs(id) ON DELETE SET NULL,
            department VARCHAR,
            batch VARCHAR,
            category VARCHAR,
            due_date TIMESTAMPTZ,
            status VARCHAR NOT NULL DEFAULT 'draft',
            created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ DEFAULT now(),
            is_deleted BOOLEAN NOT NULL DEFAULT false,
            deleted_at TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_fee_structures_college_id ON fee_structures(college_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fee_structures_academic_year ON fee_structures(academic_year)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fee_structures_is_deleted ON fee_structures(is_deleted)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS fee_structure_items (
            id VARCHAR PRIMARY KEY,
            college_id VARCHAR NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
            structure_id VARCHAR NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
            fee_head VARCHAR NOT NULL,
            amount DOUBLE PRECISION NOT NULL,
            refundable BOOLEAN NOT NULL DEFAULT false,
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_deleted BOOLEAN NOT NULL DEFAULT false,
            deleted_at TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_fee_structure_items_college_id ON fee_structure_items(college_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fee_structure_items_structure_id ON fee_structure_items(structure_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fee_structure_items_is_deleted ON fee_structure_items(is_deleted)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS fee_concessions (
            id VARCHAR PRIMARY KEY,
            college_id VARCHAR NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
            student_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            invoice_id VARCHAR NOT NULL REFERENCES student_fee_invoices(id) ON DELETE CASCADE,
            amount DOUBLE PRECISION NOT NULL,
            reason TEXT NOT NULL,
            status VARCHAR NOT NULL DEFAULT 'pending',
            requested_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
            approved_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
            approved_at TIMESTAMPTZ,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            is_deleted BOOLEAN NOT NULL DEFAULT false,
            deleted_at TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_fee_concessions_college_id ON fee_concessions(college_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fee_concessions_student_id ON fee_concessions(student_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fee_concessions_invoice_id ON fee_concessions(invoice_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fee_concessions_is_deleted ON fee_concessions(is_deleted)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS fee_refunds (
            id VARCHAR PRIMARY KEY,
            college_id VARCHAR NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
            student_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            invoice_id VARCHAR NOT NULL REFERENCES student_fee_invoices(id) ON DELETE CASCADE,
            payment_id VARCHAR REFERENCES fee_payments(id) ON DELETE SET NULL,
            amount DOUBLE PRECISION NOT NULL,
            reason TEXT NOT NULL,
            status VARCHAR NOT NULL DEFAULT 'pending',
            requested_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
            processed_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
            processed_at TIMESTAMPTZ,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            is_deleted BOOLEAN NOT NULL DEFAULT false,
            deleted_at TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_fee_refunds_college_id ON fee_refunds(college_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fee_refunds_student_id ON fee_refunds(student_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fee_refunds_invoice_id ON fee_refunds(invoice_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fee_refunds_is_deleted ON fee_refunds(is_deleted)")

    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'fee_payments_cashier_session_id_fkey'
            ) THEN
                ALTER TABLE fee_payments
                ADD CONSTRAINT fee_payments_cashier_session_id_fkey
                FOREIGN KEY (cashier_session_id) REFERENCES cashier_sessions(id) ON DELETE SET NULL;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_cashier_session_id_fkey")
    op.execute("DROP TABLE IF EXISTS fee_refunds")
    op.execute("DROP TABLE IF EXISTS fee_concessions")
    op.execute("DROP TABLE IF EXISTS fee_structure_items")
    op.execute("DROP TABLE IF EXISTS fee_structures")
    op.execute("DROP TABLE IF EXISTS cashier_sessions")
    op.execute("ALTER TABLE fee_payments DROP COLUMN IF EXISTS received_from")
    op.execute("ALTER TABLE fee_payments DROP COLUMN IF EXISTS remarks")
    op.execute("ALTER TABLE fee_payments DROP COLUMN IF EXISTS verification_token")
    op.execute("ALTER TABLE fee_payments DROP COLUMN IF EXISTS cashier_session_id")
    op.execute("ALTER TABLE fee_payments DROP COLUMN IF EXISTS collected_by")
    op.execute("ALTER TABLE fee_payments DROP COLUMN IF EXISTS payment_mode")
    op.execute("ALTER TABLE fee_payments DROP COLUMN IF EXISTS receipt_no")
    op.execute("ALTER TABLE student_fee_invoices DROP COLUMN IF EXISTS cancelled_at")
    op.execute("ALTER TABLE student_fee_invoices DROP COLUMN IF EXISTS cancelled_by")
    op.execute("ALTER TABLE student_fee_invoices DROP COLUMN IF EXISTS created_by")
    op.execute("ALTER TABLE student_fee_invoices DROP COLUMN IF EXISTS status")
    op.execute("ALTER TABLE student_fee_invoices DROP COLUMN IF EXISTS invoice_no")
