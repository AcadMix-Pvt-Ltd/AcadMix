"""Add infrastructure expenditures

Revision ID: aa6a961ea298
Revises: 92d33ab9de2c
Create Date: 2026-05-24 19:17:43.245259

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'aa6a961ea298'
down_revision: Union[str, Sequence[str], None] = '92d33ab9de2c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('infrastructure_expenditures',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('college_id', sa.String(), nullable=False),
    sa.Column('academic_year', sa.Integer(), nullable=False),
    sa.Column('category', sa.String(), nullable=False),
    sa.Column('budgeted_amount', sa.Float(), server_default=sa.text('0.0'), nullable=False),
    sa.Column('actual_expenditure', sa.Float(), server_default=sa.text('0.0'), nullable=False),
    sa.Column('evidence_s3_key', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['college_id'], ['colleges.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_infrastructure_expenditures_college_id'), 'infrastructure_expenditures', ['college_id'], unique=False)
    op.create_index(op.f('ix_infrastructure_expenditures_id'), 'infrastructure_expenditures', ['id'], unique=False)
    op.create_index(op.f('ix_infrastructure_expenditures_is_deleted'), 'infrastructure_expenditures', ['is_deleted'], unique=False)
    op.create_table('institutional_mous',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('college_id', sa.String(), nullable=False),
    sa.Column('partner_name', sa.String(), nullable=False),
    sa.Column('partner_type', sa.String(), nullable=False),
    sa.Column('activity_type', sa.String(), nullable=False),
    sa.Column('valid_from', sa.Date(), nullable=False),
    sa.Column('valid_till', sa.Date(), nullable=False),
    sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
    sa.Column('evidence_s3_key', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['college_id'], ['colleges.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_institutional_mous_college_id'), 'institutional_mous', ['college_id'], unique=False)
    op.create_index(op.f('ix_institutional_mous_id'), 'institutional_mous', ['id'], unique=False)
    op.create_index(op.f('ix_institutional_mous_is_deleted'), 'institutional_mous', ['is_deleted'], unique=False)

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_institutional_mous_is_deleted'), table_name='institutional_mous')
    op.drop_index(op.f('ix_institutional_mous_id'), table_name='institutional_mous')
    op.drop_index(op.f('ix_institutional_mous_college_id'), table_name='institutional_mous')
    op.drop_table('institutional_mous')
    op.drop_index(op.f('ix_infrastructure_expenditures_is_deleted'), table_name='infrastructure_expenditures')
    op.drop_index(op.f('ix_infrastructure_expenditures_id'), table_name='infrastructure_expenditures')
    op.drop_index(op.f('ix_infrastructure_expenditures_college_id'), table_name='infrastructure_expenditures')
    op.drop_table('infrastructure_expenditures')
