import os
import logging
import bcrypt
import jwt
import uuid
import redis.asyncio as aioredis
from datetime import datetime, timezone, timedelta
from typing import Optional, Any

from fastapi import Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from database import get_db, tenant_context
from app import models
from app.core.config import settings

logger = logging.getLogger("acadmix.security")

# ─── Configuration ────────────────────────────────────────────────────────────

JWT_SECRET = settings.JWT_SECRET
if not JWT_SECRET:
    raise ValueError("JWT_SECRET environment variable must be set!")
JWT_ALGORITHM = settings.JWT_ALGORITHM

redis_url = settings.REDIS_URL
redis_client = aioredis.from_url(redis_url, socket_connect_timeout=0.2, socket_timeout=0.5) if redis_url else None

class TokenBlacklistConfig:
    USE_BLACKLIST = os.getenv("USE_TOKEN_BLACKLIST", "true").lower() == "true"
    ACCESS_TOKEN_TTL_MINUTES = 120   # 120 min — frontend refresh interceptor handles renewal
    REFRESH_TOKEN_TTL_DAYS = 7
    BLACKLIST_CHECK_REDIS = True

# ─── Auth Helpers ─────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, role: str, tenant_id: str = "", permissions: dict = None, session_id: str = None) -> str:
    perms = permissions or {}
    payload = {
        "sub": user_id, 
        "role": role, 
        "tenant_id": tenant_id, 
        "permissions": perms, 
        "exp": datetime.now(timezone.utc) + timedelta(minutes=TokenBlacklistConfig.ACCESS_TOKEN_TTL_MINUTES), 
        "type": "access",
        "jti": str(uuid.uuid4())
    }
    if session_id:
        payload["session_id"] = session_id
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str, jti: str = None) -> str:
    return jwt.encode({
        "sub": user_id, 
        "exp": datetime.now(timezone.utc) + timedelta(days=TokenBlacklistConfig.REFRESH_TOKEN_TTL_DAYS), 
        "type": "refresh",
        "jti": jti or str(uuid.uuid4())
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_pre_enroll_token(token: str) -> dict:
    """Verifies a pre-enrollment token with explicit issuer enforcement."""
    return jwt.decode(
        token, 
        settings.PRE_ENROLL_JWT_SECRET, 
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["iss", "type"]},
        issuer="pre_enroll_issuer"
    )

async def get_pre_enroll_user(request: Request) -> dict:
    """Extracts and verifies the pre-enrollment token for guest admission access."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated via Pre-Enroll token")
    token = auth[7:]
    try:
        payload = verify_pre_enroll_token(token)
        if payload.get("type") != "pre_enroll":
            raise HTTPException(status_code=401, detail="Invalid token type")
        return {
            "id": payload.get("sub"), # This is the admission.id
            "college_id": payload.get("college_id"),
            "admission_number": payload.get("admission_number"),
            "gender": payload.get("gender")
        }
    except Exception as e:
        logger.warning(f"Failed pre-enroll token verification: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired Pre-Enroll token")

# ─── Dependencies ─────────────────────────────────────────────────────────────

async def get_current_user(request: Request, session: AsyncSession = Depends(get_db)) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
            
        if TokenBlacklistConfig.USE_BLACKLIST and redis_client:
            jti = payload.get("jti")
            if jti and await redis_client.exists(f"revoked_access:{jti}"):
                raise HTTPException(status_code=401, detail="Token revoked")
        
        # --- Active Session Verification ---
        session_id = payload.get("session_id")
        if session_id and redis_client:
            is_active = await redis_client.exists(f"session:active:{payload['sub']}:{session_id}")
            if not is_active:
                raise HTTPException(status_code=401, detail="Session expired due to inactivity")
        elif redis_client:
            # Hard enforcement: legacy tokens (missing session_id) must be proactively evicted.
            raise HTTPException(status_code=401, detail="Session re-authentication required")
        
        from sqlalchemy import text
        jwt_college_id = payload.get("tenant_id") or payload.get("college_id")
        if jwt_college_id:
            await session.execute(
                text("SELECT set_config('app.college_id', :cid, true)"),
                {"cid": jwt_college_id},
            )
        
        result = await session.execute(select(models.User).where(models.User.id == payload["sub"]))
        user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
            
        user_dict = {
            "id": user.id,
            "role": user.role,
            "email": user.email,
            "name": user.name,
            "tenant_id": user.college_id,
            "college_id": user.college_id,
            "permissions": payload.get("permissions", {})
        }
        if user.profile_data:
            # Prevent JSONB prototype pollution from overwriting core claims
            for k, v in user.profile_data.items():
                if k not in ["id", "role", "email", "name", "tenant_id", "college_id"]:
                    user_dict[k] = v
            # Also include as nested dict for components that read user.profile_data
            user_dict["profile_data"] = user.profile_data
            
        if "tenant_id" not in user_dict:
            user_dict["tenant_id"] = user_dict.get("college_id", "")
        
        # Nodal officers without a college_id get None context
        tenant_context.set(user.college_id)
            
        session.info["college_id"] = user_dict.get("college_id", "")
        session.info["role"] = user.role
        session.info["user_id"] = user.id
        
        import json
        from sqlalchemy import text
        
        # Set GUC variables for RLS policy evaluation.
        # app.college_id → used by tenant_isolation policies on all tables
        # request.jwt.claims → legacy Supabase-style claims (kept for compatibility)
        college_id_str = user_dict.get("college_id", "")
        if college_id_str:
            await session.execute(
                text("SELECT set_config('app.college_id', :cid, true)"),
                {"cid": college_id_str},
            )
        
        jwt_claims = json.dumps({
            "college_id": college_id_str,
            "role": user.role,
            "sub": user.id
        })
        
        await session.execute(
            text("SELECT set_config('request.jwt.claims', :jwt, true);"),
            {"jwt": jwt_claims}
        )

        return user_dict
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        logger.warning("Invalid JWT token presented: %s", type(e).__name__)
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        # Log full exception server-side but redact details from client response
        logger.exception("Internal error during token validation")
        raise HTTPException(status_code=500, detail="Internal server error")

def require_role(*roles):
    async def check(request: Request, session: AsyncSession = Depends(get_db)):
        user = await get_current_user(request, session)
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return check

def require_permission(module: str, action: str):
    async def check(request: Request, session: AsyncSession = Depends(get_db)):
        user = await get_current_user(request, session)
        if user["role"] in ["super_admin", "admin"]:
            return user
        
        perms = user.get("permissions", {})
        module_perms = perms.get(module, [])
        if action not in module_perms:
            raise HTTPException(status_code=403, detail=f"Insufficient permissions: requires {module}.{action}")
        return user
    return check
