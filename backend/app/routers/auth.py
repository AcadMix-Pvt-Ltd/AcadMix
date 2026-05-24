"""
Auth Router — thin HTTP layer delegating to AuthService.
"""

import logging
from fastapi import APIRouter, Depends, Request, Response, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.core.security import get_current_user
from app.services.auth_service import AuthService
from app.core.config import settings

logger = logging.getLogger("acadmix.auth")
router = APIRouter()


def _verify_origin(request: Request):
    """CSRF protection: verify Origin header matches allowed CORS origins.
    Non-browser clients (curl, Postman, mobile) won't send Origin — those are safe.
    """
    origin = request.headers.get("origin") or ""
    if not origin:
        return  # Non-browser client — no CSRF risk
    allowed = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
    if not any(origin.startswith(a) for a in allowed):
        logger.warning("CSRF: rejected request from origin=%s", origin)
        raise HTTPException(status_code=403, detail="Origin not allowed")


class LoginRequest(BaseModel):
    college_id: str
    password: str


class RegisterRequest(BaseModel):
    name: str = Field(..., max_length=150)
    college_id: str = Field(..., max_length=50)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6, max_length=100)
    role: str = Field("student", max_length=30)
    college: str = Field("GNITC", max_length=50)
    department: str = Field("", max_length=100)
    batch: str = Field("", max_length=20)
    section: str = Field("", max_length=20)


from app.core.limiter import limiter

@router.post("/login")
@limiter.limit("5/minute")
async def login(req: LoginRequest, request: Request, response: Response, session: AsyncSession = Depends(get_db)):
    _verify_origin(request)
    
    tenant = getattr(request.state, "tenant", None)
    tenant_college_id = tenant.college_id if tenant else None
    
    svc = AuthService(session)
    result = await svc.login(req.college_id, req.password, tenant_college_id)

    response.set_cookie("access_token", result["access_token"], httponly=True, secure=True, samesite="lax", max_age=7200)
    response.set_cookie("refresh_token", result.pop("_refresh_token"), httponly=True, secure=True, samesite="lax", max_age=604800, path="/api/auth")
    return result


@router.post("/register")
async def register(req: RegisterRequest):
    from app.core.exceptions import BusinessLogicError
    raise BusinessLogicError("Self-registration is disabled. Please contact your college administrator.")


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    svc = AuthService(session)
    return await svc.get_current_user_profile(user)


@router.post("/logout")
async def logout(request: Request, response: Response, session: AsyncSession = Depends(get_db)):
    _verify_origin(request)
    svc = AuthService(session)
    await svc.logout(request.cookies.get("refresh_token"))
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token", path="/api/auth")
    return {"message": "Logged out"}


@router.post("/refresh")
@limiter.limit("5/minute")
async def refresh_access_token(request: Request, response: Response, session: AsyncSession = Depends(get_db)):
    svc = AuthService(session)
    result = await svc.refresh(request.cookies.get("refresh_token"))
    response.set_cookie("access_token", result["access_token"], httponly=True, secure=True, samesite="lax", max_age=7200)
    return result


@router.post("/logout/all")
async def logout_all(request: Request, response: Response, user: dict = Depends(get_current_user)):
    _verify_origin(request)
    from app.core.security import redis_client
    if redis_client:
        keys = await redis_client.keys(f"session:active:{user['id']}:*")
        if keys:
            await redis_client.delete(*keys)
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token", path="/api/auth")
    return {"message": "Logged out of all devices"}


@router.post("/heartbeat")
async def heartbeat(request: Request, user: dict = Depends(get_current_user)):
    """
    Extends the active session TTL securely.
    Protected by a native 90s cooldown to preclude malicious TTL spam loops.
    """
    from app.core.security import redis_client
    import jwt
    from app.core.security import JWT_SECRET, JWT_ALGORITHM
    
    if not redis_client:
        return {"status": "ok"}
        
    # Standard extraction matching get_current_user's resolution tree
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]

    if not token:
        return {"status": "noop"}

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        session_id = payload.get("session_id")
        user_id = payload.get("sub")
        
        if session_id and user_id:
            throttle_key = f"rl:heartbeat:{session_id}"
            
            # Simple rate limiting logic protecting sliding loop execution (Atomic)
            is_throttled = await redis_client.set(throttle_key, "1", nx=True, ex=90)
            if not is_throttled:
                return {"status": "skipped_throttle"}
                
            await redis_client.expire(f"session:active:{user_id}:{session_id}", 7200)
    except Exception:
        pass 
        
    return {"status": "ok"}
