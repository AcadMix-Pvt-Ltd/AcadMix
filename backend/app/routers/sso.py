import os
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from starlette.responses import RedirectResponse
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from authlib.integrations.starlette_client import OAuth, OAuthError

from app.core.config import settings
from app.core.security import create_access_token
from app.core.tenant_middleware import get_tenant, TenantContext
from database import get_db
from app.models.core import User, UserProfile

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sso", tags=["SSO"])

oauth = OAuth()
oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID', 'placeholder'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET', 'placeholder'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)
oauth.register(
    name='azure',
    client_id=os.getenv('AZURE_CLIENT_ID', 'placeholder'),
    client_secret=os.getenv('AZURE_CLIENT_SECRET', 'placeholder'),
    server_metadata_url=f"https://login.microsoftonline.com/{os.getenv('AZURE_TENANT_ID', 'common')}/v2.0/.well-known/openid-configuration",
    client_kwargs={'scope': 'openid email profile'},
)

@router.get("/login/{provider}")
async def sso_login(provider: str, request: Request, tenant: TenantContext = Depends(get_tenant)):
    """Initiate SSO login for the given provider."""
    if not tenant:
        raise HTTPException(status_code=400, detail="Tenant context required for SSO.")
    
    client = oauth.create_client(provider)
    if not client:
        raise HTTPException(status_code=400, detail=f"SSO provider '{provider}' is not supported.")
    
    # Store tenant slug in state so callback knows which tenant is logging in
    redirect_uri = f"{settings.API_BASE_URL}/api/v1/sso/callback/{provider}"
    return await client.authorize_redirect(request, redirect_uri, state=tenant.slug)

@router.get("/callback/{provider}")
async def sso_callback(provider: str, request: Request, session: AsyncSession = Depends(get_db)):
    """Handle OAuth2 callback and authenticate user."""
    client = oauth.create_client(provider)
    if not client:
        raise HTTPException(status_code=400, detail="Invalid provider")
    
    try:
        token = await client.authorize_access_token(request)
        user_info = token.get('userinfo')
        if not user_info:
            # Fallback if userinfo is not in token
            user_info = await client.userinfo(token=token)
    except OAuthError as error:
        logger.error(f"SSO Error: {error.error}")
        raise HTTPException(status_code=401, detail="SSO Authentication failed")

    tenant_slug = request.query_params.get("state")
    if not tenant_slug:
        raise HTTPException(status_code=400, detail="Missing tenant state.")

    # We need to resolve the tenant ID for this slug since tenant_middleware 
    # uses headers, and the callback comes via browser redirect.
    from app.core.tenant_middleware import resolve_tenant
    tenant_config = await resolve_tenant(tenant_slug)
    if not tenant_config:
        raise HTTPException(status_code=400, detail="Invalid tenant in SSO state.")
    
    college_id = tenant_config["college_id"]
    email = user_info.get("email")
    sso_id = user_info.get("sub") or user_info.get("oid")
    name = user_info.get("name") or email.split("@")[0]
    
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by SSO provider.")

    # Find existing user in this tenant
    stmt = select(User).where(User.college_id == college_id, User.email == email)
    result = await session.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        # Auto-provision new user for this tenant. 
        # By default, we might provision them as a generic "guest" or fail.
        # For AcadMix, it's safer to fail if they haven't been invited, 
        # unless just-in-time provisioning is enabled. Let's auto-provision as 'student' for now.
        user = User(
            id=str(uuid.uuid4()),
            college_id=college_id,
            email=email,
            name=name,
            role="student",
            password_hash="sso_managed",
            sso_provider=provider,
            sso_id=sso_id
        )
        session.add(user)
        # Create blank profile
        profile = UserProfile(
            user_id=user.id,
            college_id=college_id
        )
        session.add(profile)
        await session.commit()
        await session.refresh(user)
    else:
        # Update SSO info if linking existing account
        if not user.sso_provider:
            user.sso_provider = provider
            user.sso_id = sso_id
            await session.commit()

    # Issue JWT token
    access_token_expires = datetime.now(timezone.utc).timestamp() + (settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    access_token = create_access_token(
        data={"sub": user.id, "role": user.role, "college_id": user.college_id}
    )
    
    # Redirect back to the frontend with the token
    # In production, use HttpOnly cookies or redirect to a frontend callback page
    frontend_url = f"http://{tenant_slug}.acadmix.org/sso-success?token={access_token}"
    if os.getenv('ENVIRONMENT') == 'development':
        frontend_url = f"http://{tenant_slug}.localhost:3000/sso-success?token={access_token}"
        
    return RedirectResponse(url=frontend_url)
