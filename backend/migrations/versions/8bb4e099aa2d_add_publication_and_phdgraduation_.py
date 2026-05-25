"""Add Publication and PhDGraduation models for NIRF 2025

Revision ID: 8bb4e099aa2d
Revises: 981b165a45c3
Create Date: 2026-05-25 10:04:46.191311

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '8bb4e099aa2d'
down_revision: Union[str, Sequence[str], None] = '981b165a45c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('phd_graduation_records',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('college_id', sa.String(), nullable=False),
    sa.Column('student_id', sa.String(), nullable=True),
    sa.Column('student_name', sa.String(), nullable=False),
    sa.Column('academic_year', sa.String(), nullable=False),
    sa.Column('thesis_title', sa.String(), nullable=True),
    sa.Column('supervisor_id', sa.String(), nullable=True),
    sa.Column('awarded_date', sa.Date(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['college_id'], ['colleges.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['supervisor_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_phd_graduation_records_college_id'), 'phd_graduation_records', ['college_id'], unique=False)
    op.create_index(op.f('ix_phd_graduation_records_id'), 'phd_graduation_records', ['id'], unique=False)
    op.create_index(op.f('ix_phd_graduation_records_is_deleted'), 'phd_graduation_records', ['is_deleted'], unique=False)
    
    op.create_table('publication_records',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('college_id', sa.String(), nullable=False),
    sa.Column('faculty_id', sa.String(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('calendar_year', sa.Integer(), nullable=False),
    sa.Column('journal_name', sa.String(), nullable=True),
    sa.Column('citation_count', sa.Integer(), server_default=sa.text('0'), nullable=False),
    sa.Column('is_top_25_percentile', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('is_retracted', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['college_id'], ['colleges.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['faculty_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_publication_records_college_id'), 'publication_records', ['college_id'], unique=False)
    op.create_index(op.f('ix_publication_records_id'), 'publication_records', ['id'], unique=False)
    op.create_index(op.f('ix_publication_records_is_deleted'), 'publication_records', ['is_deleted'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_publication_records_is_deleted'), table_name='publication_records')
    op.drop_index(op.f('ix_publication_records_id'), table_name='publication_records')
    op.drop_index(op.f('ix_publication_records_college_id'), table_name='publication_records')
    op.drop_table('publication_records')
    
    op.drop_index(op.f('ix_phd_graduation_records_is_deleted'), table_name='phd_graduation_records')
    op.drop_index(op.f('ix_phd_graduation_records_id'), table_name='phd_graduation_records')
    op.drop_index(op.f('ix_phd_graduation_records_college_id'), table_name='phd_graduation_records')
    op.drop_table('phd_graduation_records')
    # ### end Alembic commands ###
