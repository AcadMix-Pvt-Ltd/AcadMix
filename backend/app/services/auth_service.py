"""
Auth Service — handles authentication business logic.
Encapsulates login brute-force protection, credential verification,
token creation, logout revocation, and token refresh.
"""

import jwt
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app import models
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    redis_client,
    JWT_SECRET,
    JWT_ALGORITHM,
    TokenBlacklistConfig,
)
from app.core.exceptions import DomainException, ResourceNotFoundError
from database import AsyncSessionLocal


class AuthenticationError(DomainException):
    """Raised on login failures."""
    def __init__(self, message: str = "Invalid credentials"):
        super().__init__(message=message, status_code=401)


class RateLimitedError(DomainException):
    """Raised when brute-force threshold is exceeded."""
    def __init__(self):
        super().__init__(
            message="Too many failed attempts. Try again in 5 minutes.",
            status_code=429,
        )


class AuthService:
    """Stateless service for authentication operations."""

    MAX_LOGIN_FAILURES = 5
    LOCKOUT_SECONDS = 300

    def __init__(self, db: AsyncSession):
        self.db = db

    async def login(self, username: str, password: str, tenant_college_id: Optional[str] = None) -> Dict[str, Any]:
        """Authenticate a user and return token data + user profile.

        Returns:
            dict with user info and access/refresh tokens.

        Raises:
            RateLimitedError: Too many failed attempts.
            AuthenticationError: Invalid credentials.
        """
        print(f"DEBUG LOGIN INPUT: user={username}, password={password}, tenant_college_id={tenant_college_id}")
        import logging
        logger = logging.getLogger("acadmix.security")
        normalized = username.strip().upper()
        key = f"login_failures:{normalized}"

        # Rate-limit check
        if redis_client:
            try:
                failures = await redis_client.get(key)
                if failures and int(failures) >= self.MAX_LOGIN_FAILURES:
                    raise RateLimitedError()
            except RateLimitedError:
                raise
            except Exception as e:
                logger.warning(
                    f"redis_unavailable_brute_force_check_skipped: "
                    f"username='{username}', error='{e}'. Monitoring bypassed."
                )

        # Lookup user (case-insensitive for both roll_number and email) globally first
        from sqlalchemy import func
        from database import AdminSessionLocal
        
        async with AdminSessionLocal() as admin_session:
            result = await admin_session.execute(
                select(models.User)
                .outerjoin(models.UserProfile)
                .where(
                    (models.UserProfile.roll_number == normalized)
                    | (func.upper(models.User.email) == normalized)
                )
            )
            user = result.scalars().first()
            if user:
                admin_session.expunge_all()
        print(f"DEBUG LOGIN LOOKUP: user found={user is not None}, tenant_college_id={tenant_college_id}")

        # Check tenant scope bypass impersonation (P0 Hardening)
        if user and tenant_college_id and user.college_id and user.role != "super_admin":
            if str(user.college_id) != str(tenant_college_id):
                # We caught a cross-tenant login attempt. Log and fail silently.
                print(f"DEBUG CROSS-TENANT IMPERSONATION ATTEMPT: username='{username}', attempted_college_id='{tenant_college_id}', resolved_college_id='{user.college_id}'")
                logger.warning(
                    f"CROSS-TENANT IMPERSONATION ATTEMPT "
                    f"username='{username}', "
                    f"attempted_college_id='{tenant_college_id}', "
                    f"resolved_college_id='{user.college_id}'"
                )
                user = None  # Neutralize user to force typical authentication failure

        if not user or not verify_password(password, user.password_hash) or getattr(user, "is_anonymized", False):
            if redis_client:
                try:
                    pipe = redis_client.pipeline()
                    pipe.incr(key)
                    pipe.expire(key, self.LOCKOUT_SECONDS)
                    await pipe.execute()
                except Exception as e:
                    logger.warning(f"Redis increment bypass due to error: {e}")
            
            raise AuthenticationError("Account no longer exists" if getattr(user, "is_anonymized", False) else "Invalid credentials")

        from app.services.audit_service import AuditService

        # Success — clear failure counter
        if redis_client:
            try:
                await redis_client.delete(key)
            except Exception as e:
                pass

        # Build permissions from role table
        perms = await self._resolve_role_permissions(user)

        tid = user.college_id or ""
        
        import uuid
        session_id = str(uuid.uuid4())
        access = create_access_token(user.id, user.role, tid, perms, session_id=session_id)
        refresh = create_refresh_token(user.id, jti=session_id)
        
        if redis_client:
            try:
                await redis_client.setex(f"session:active:{user.id}:{session_id}", 7200, "1")
            except Exception as e:
                import logging
                logging.getLogger("acadmix.security").error(f"Failed to set active session tracking: {e}")

        # Explicit Audit Log (skip super_admin — platform college bypasses tenant RLS)
        if user.role not in ("student", "super_admin"):
            await AuditService.log_audit(
                db=self.db,
                college_id=tid,
                user_id=user.id,
                action="USER_LOGIN",
                resource_type="auth",
                resource_id=user.id,
                status="success"
            )

        user_out = {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "college_id": user.college_id,
            "tenant_id": user.college_id,
            "access_token": access,
            "_refresh_token": refresh,
        }
        if user.profile_data:
            user_out.update({k: v for k, v in user.profile_data.items() if k != "password_hash"})
            # Also include as nested dict for components that read user.profile_data
            user_out["profile_data"] = user.profile_data

        return user_out

    async def get_current_user_profile(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich the current user dict with permission flags and teaching scope."""
        perm_r = await self.db.execute(
            select(models.UserPermission).where(models.UserPermission.user_id == user["id"])
        )
        perm_row = perm_r.scalars().first()
        permission_flags = perm_row.flags if perm_row else {}

        scope = {}
        if user["role"] in ("teacher", "faculty", "hod"):
            assigns_r = await self.db.execute(
                select(models.FacultyAssignment).where(
                    models.FacultyAssignment.teacher_id == user["id"]
                )
            )
            assigns = assigns_r.scalars().all()
            if assigns:
                scope["subject_codes"] = list({a.subject_code for a in assigns})
                scope["batch_ids"] = list({a.batch for a in assigns})
                scope["department"] = assigns[0].department

        return {**user, "permissions": permission_flags, "scope": scope}

    async def logout(self, refresh_token: Optional[str]) -> None:
        """Blacklist a refresh token if Redis is available."""
        if not refresh_token:
            return
        try:
            from app.services.audit_service import AuditService
            payload = jwt.decode(refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            jti = payload.get("jti")
            user_id = payload.get("sub")
            
            if redis_client and jti:
                try:
                    await redis_client.setex(f"revoked_refresh:{jti}", 604800, "revoked")
                    if user_id:
                        await redis_client.delete(f"session:active:{user_id}:{jti}")
                except Exception as e:
                    import logging
                    logging.getLogger("acadmix.security").warning(f"Redis unavailable during logout for jti={jti}: {e}")
                
            if user_id:
                # Need college_id, fetch user
                result = await self.db.execute(select(models.User).where(models.User.id == user_id))
                user = result.scalars().first()
                if user and user.role != "student":
                    await AuditService.log_audit(
                        db=self.db,
                        college_id=user.college_id,
                        user_id=user_id,
                        action="TOKEN_REVOKED",
                        resource_type="auth",
                        resource_id=jti or user_id,
                        status="success"
                    )
        except jwt.InvalidTokenError:
            pass

    async def refresh(self, refresh_token: Optional[str]) -> Dict[str, Any]:
        """Validate a refresh token and issue a new access token.

        Returns:
            dict with new access_token and expires_in.

        Raises:
            AuthenticationError: Invalid/expired/revoked refresh token.
        """
        if not refresh_token:
            raise AuthenticationError("No refresh token")

        try:
            payload = jwt.decode(refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if payload.get("type") != "refresh":
                raise AuthenticationError("Invalid token type")

            jti = payload.get("jti")
            user_id = payload["sub"]

            if redis_client:
                try:
                    if await redis_client.exists(f"revoked_refresh:{jti}"):
                        raise AuthenticationError("Refresh token revoked")
                    # Intercept logic for Sliding Session 
                    if not await redis_client.exists(f"session:active:{user_id}:{jti}"):
                        raise AuthenticationError("Session expired due to inactivity")
                except AuthenticationError:
                    raise
                except Exception as e:
                    import logging
                    logging.getLogger("acadmix.security").warning(f"Redis unavailable during refresh for jti={jti}: {e}. Bypassing session check.")

            result = await self.db.execute(
                select(models.User).where(models.User.id == user_id)
            )
            user = result.scalars().first()
            if not user:
                raise AuthenticationError("User not found")

            perms = await self._resolve_role_permissions(user)
            new_access = create_access_token(user_id, user.role, user.college_id or "", perms, session_id=jti)
            return {"access_token": new_access, "expires_in": TokenBlacklistConfig.ACCESS_TOKEN_TTL_MINUTES * 60}

        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Refresh token expired")
        except jwt.InvalidTokenError:
            raise AuthenticationError("Invalid refresh token")

    # ── Private helpers ──────────────────────────────────────────────────

    async def _resolve_role_permissions(self, user: models.User) -> dict:
        """Load custom permissions for non-standard roles."""
        if user.role in ("student", "super_admin", "admin"):
            return {}
        role_result = await self.db.execute(
            select(models.Role).where(
                models.Role.name == user.role,
                models.Role.college_id == user.college_id,
            )
        )
        r = role_result.scalars().first()
        return r.permissions if r else {}
