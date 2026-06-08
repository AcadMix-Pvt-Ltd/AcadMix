"""normalize_mock_interviews_schema

Revision ID: d0c54c7051a1
Revises: e64b3fef3e85
Create Date: 2026-06-08 14:43:55.186460

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd0c54c7051a1'
down_revision: Union[str, Sequence[str], None] = 'e64b3fef3e85'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create the new normalized messages table
    op.create_table('mock_interview_messages',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('college_id', sa.String(), nullable=False),
        sa.Column('student_id', sa.String(), nullable=False),
        sa.Column('interview_id', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('timestamp', sa.String(), nullable=True),
        sa.Column('source', sa.String(), server_default='http', nullable=False),
        sa.Column('kind', sa.String(), server_default='question', nullable=False),
        sa.Column('q_number', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['college_id'], ['colleges.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['interview_id'], ['mock_interviews.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_mock_interview_messages_college_id'), 'mock_interview_messages', ['college_id'], unique=False)
    op.create_index(op.f('ix_mock_interview_messages_id'), 'mock_interview_messages', ['id'], unique=False)
    op.create_index(op.f('ix_mock_interview_messages_interview_id'), 'mock_interview_messages', ['interview_id'], unique=False)
    op.create_index(op.f('ix_mock_interview_messages_is_deleted'), 'mock_interview_messages', ['is_deleted'], unique=False)
    op.create_index(op.f('ix_mock_interview_messages_student_id'), 'mock_interview_messages', ['student_id'], unique=False)

    # Add the indexed assembly_ai_job_id column to mock_interviews table
    op.add_column('mock_interviews', sa.Column('assembly_ai_job_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_mock_interviews_assembly_ai_job_id'), 'mock_interviews', ['assembly_ai_job_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_mock_interviews_assembly_ai_job_id'), table_name='mock_interviews')
    op.drop_column('mock_interviews', 'assembly_ai_job_id')
    op.drop_index(op.f('ix_mock_interview_messages_student_id'), table_name='mock_interview_messages')
    op.drop_index(op.f('ix_mock_interview_messages_is_deleted'), table_name='mock_interview_messages')
    op.drop_index(op.f('ix_mock_interview_messages_interview_id'), table_name='mock_interview_messages')
    op.drop_index(op.f('ix_mock_interview_messages_id'), table_name='mock_interview_messages')
    op.drop_index(op.f('ix_mock_interview_messages_college_id'), table_name='mock_interview_messages')
    op.drop_table('mock_interview_messages')
