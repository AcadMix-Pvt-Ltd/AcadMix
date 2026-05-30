"""Add SSO and Stripe fields

Revision ID: d66fcfa345f2
Revises: 8bb4e099aa2d
Create Date: 2026-05-25 23:10:52.022191

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd66fcfa345f2'
down_revision: Union[str, Sequence[str], None] = '8bb4e099aa2d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('colleges', sa.Column('stripe_customer_id', sa.String(), nullable=True))
    op.add_column('colleges', sa.Column('stripe_subscription_id', sa.String(), nullable=True))
    op.add_column('users', sa.Column('sso_provider', sa.String(), nullable=True))
    op.add_column('users', sa.Column('sso_id', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'sso_id')
    op.drop_column('users', 'sso_provider')
    op.drop_column('colleges', 'stripe_subscription_id')
    op.drop_column('colleges', 'stripe_customer_id')
