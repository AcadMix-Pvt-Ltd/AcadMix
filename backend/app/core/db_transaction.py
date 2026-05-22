import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import AsyncSession

# We import the session makers and context vars from the global database module
# rather than redefining them here to ensure connection pool sharing.
from database import AsyncSessionLocal, AdminSessionLocal, _set_tenant_guc, _set_admin_bypass, tenant_context

logger = logging.getLogger("acadmix.db_transaction")

@asynccontextmanager
async def tenant_transaction(college_id: Optional[str] = None) -> AsyncGenerator[AsyncSession, None]:
    """
    Robust Unit of Work context manager for tenant-scoped operations outside of FastAPI requests.
    
    This is ideal for background tasks (ARQ workers), scripts, or WebSockets where 
    FastAPI's dependency injection (`get_db`) is not available, but you still need
    full Row-Level Security (RLS) enforcement and automatic transaction boundaries.
    
    Usage:
        async with tenant_transaction(college_id="...") as session:
            session.add(models.User(...))
            # Auto-commits on successful block exit.
            # Auto-rolls-back if an exception is raised.
    """
    # If no explicit college_id is passed, attempt to inherit from context
    resolved_college_id = college_id or tenant_context.get()
    
    async with AsyncSessionLocal() as session:
        async with session.begin():
            try:
                # Enforce RLS for this transaction scope
                await _set_tenant_guc(session, resolved_college_id)
                yield session
                # session.begin() natively handles commit on successful exit
            except Exception as e:
                logger.error("Transaction failed, rolling back. Error: %s", e)
                # session.begin() natively handles rollback on exception, 
                # but we re-raise to ensure the caller knows it failed.
                raise


@asynccontextmanager
async def admin_transaction() -> AsyncGenerator[AsyncSession, None]:
    """
    Robust Unit of Work context manager for admin operations that bypass RLS.
    
    This replaces `admin_session_ctx` with a safer `session.begin()` implementation
    that guarantees automatic commits on success.
    
    Usage:
        async with admin_transaction() as session:
            # RLS is bypassed.
            session.add(models.SystemConfig(...))
            # Auto-commits on successful block exit.
    """
    async with AdminSessionLocal() as session:
        session.info["_admin_bypass"] = True
        async with session.begin():
            try:
                await _set_admin_bypass(session)
                yield session
            except Exception as e:
                logger.error("Admin transaction failed, rolling back. Error: %s", e)
                raise
