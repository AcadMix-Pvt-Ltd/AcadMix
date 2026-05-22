from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime, timezone
import hashlib
import json
import logging

from app.schemas.insights import InsightsQueryRequest, InsightsQueryResponse, PinnedInsightCreate, PinnedInsightResponse
from app.services.ai_service import generate_insights_sql, format_insights_summary, validate_insights_semantics
from app.services.insights_executor import execute_insights_query
from app.core.security import get_current_user
from database import get_db
from app.models.core import User, PinnedInsight
from sqlalchemy import select, text
from typing import List

logger = logging.getLogger("acadmix.insights")

router = APIRouter()

# ── Insights Cache Helpers ────────────────────────────────────────────────────
INSIGHTS_CACHE_TTL = 300  # 5 minutes

async def _get_redis():
    """Lazy-import the shared Redis pool."""
    try:
        from app.services.wa_state_machine import get_redis
        return await get_redis()
    except Exception:
        return None

def _insights_cache_key(sql: str, role: str) -> str:
    """SHA-256 hash of (generated SQL + role) for semantic cache deduplication.
    
    Keying on SQL instead of NL text means semantically identical questions
    ('students below 50%' vs 'students with <50% attendance') that produce
    the same SQL will share the same cache entry.
    """
    digest = hashlib.sha256(f"{role}:{sql.strip()}".encode()).hexdigest()
    return f"insights_cache:v3:{digest}"


@router.post("/query", response_model=InsightsQueryResponse)
async def query_insights(
    request: InsightsQueryRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # RBAC: Allow all relevant dash roles
    allowed_roles = ["PRINCIPAL", "HOD", "SUPERADMIN", "ADMIN", "FACULTY", "TPO", "DHTE_NODAL", "INSTITUTIONAL_NODAL", "EXAM_CELL"]
    role = current_user.get("role", "").upper()
    if role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access the Insights module."
        )

    from app.services.insights_orchestrator import orchestrate_query
    return await orchestrate_query(request, current_user, db)

@router.post("/pins", response_model=PinnedInsightResponse)
async def create_pin(
    pin_in: PinnedInsightCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    allowed_roles = ["PRINCIPAL", "HOD", "SUPERADMIN", "ADMIN", "FACULTY", "TPO", "DHTE_NODAL", "INSTITUTIONAL_NODAL", "EXAM_CELL"]
    role = current_user.get("role", "").upper()
    if role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission."
        )
    
    target_college = pin_in.active_college_id if pin_in.active_college_id and role in ["DHTE_NODAL", "SUPERADMIN"] else current_user.get("college_id")
    
    new_pin = PinnedInsight(
        college_id=target_college,
        user_id=current_user.get("id"),
        role=role,
        title=pin_in.title,
        nl_query=pin_in.nl_query,
        cached_sql=pin_in.cached_sql,
        chart_suggestion=pin_in.chart_suggestion
    )
    db.add(new_pin)
    # Skip db.commit() — get_db() uses managed transaction (session.begin) which auto-commits.
    # Skip db.refresh() — avoids an extra SELECT round-trip; return from input data directly.
    await db.flush()  # ensures ID is generated without a full commit+refresh cycle
    return PinnedInsightResponse(
        id=new_pin.id,
        title=pin_in.title,
        nl_query=pin_in.nl_query,
        cached_sql=pin_in.cached_sql,
        chart_suggestion=pin_in.chart_suggestion,
        role=role,
        created_at=new_pin.created_at or datetime.now(timezone.utc)
    )

@router.get("/pins", response_model=List[PinnedInsightResponse])
async def get_pins(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    allowed_roles = ["PRINCIPAL", "HOD", "SUPERADMIN", "ADMIN", "FACULTY", "TPO", "DHTE_NODAL", "INSTITUTIONAL_NODAL", "EXAM_CELL"]
    role = current_user.get("role", "").upper()
    if role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission."
        )

    stmt = select(PinnedInsight).where(
        PinnedInsight.user_id == current_user.get("id"),
        PinnedInsight.role == role,
        PinnedInsight.is_deleted == False
    ).order_by(PinnedInsight.created_at.desc())
    
    result = await db.execute(stmt)
    pins = result.scalars().all()
    return pins

@router.delete("/pins/{pin_id}")
async def delete_pin(
    pin_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    role = current_user.get("role", "").upper()
    user_id = current_user.get("id")
    logger.info("delete_pin called: pin_id=%s, user_id=%s, role=%s", pin_id, user_id, role)
    
    stmt = select(PinnedInsight).where(
        PinnedInsight.id == pin_id,
        PinnedInsight.user_id == user_id,
        PinnedInsight.role == role,
        PinnedInsight.is_deleted == False
    )
    result = await db.execute(stmt)
    pin = result.scalar_one_or_none()
    
    if not pin:
        logger.warning("delete_pin: pin not found — pin_id=%s, user_id=%s, role=%s", pin_id, user_id, role)
        raise HTTPException(status_code=404, detail="Pin not found")
        
    pin.is_deleted = True
    await db.flush()  # ensure dirty flag is written within the managed transaction
    logger.info("delete_pin: success — pin_id=%s soft-deleted", pin_id)
    return {"message": "Success"}
