import os
import stripe
import logging
from fastapi import APIRouter, Request, HTTPException, Depends
from starlette.responses import JSONResponse
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from database import get_db
from app.models.core import College

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["Billing"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_placeholder")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_placeholder")

@router.post("/checkout")
async def create_checkout_session(request: Request):
    """Create a Stripe Checkout Session for onboarding a new college."""
    data = await request.json()
    college_name = data.get("college_name")
    college_domain = data.get("college_domain") # The slug they want
    admin_email = data.get("admin_email")
    plan = data.get("plan", "starter") # e.g. 'starter', 'pro', 'enterprise'
    
    if not all([college_name, college_domain, admin_email]):
        raise HTTPException(status_code=400, detail="Missing required onboarding fields.")

    # In production, lookup the price_id based on the plan string.
    # For now, using a placeholder price ID.
    price_id = "price_placeholder"
    
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f"{settings.API_BASE_URL}/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.API_BASE_URL}/cancel",
            metadata={
                "college_name": college_name,
                "college_domain": college_domain,
                "admin_email": admin_email,
                "plan": plan
            }
        )
        return {"checkout_url": checkout_session.url}
    except Exception as e:
        logger.error(f"Stripe Checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creating checkout session.")

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe Webhooks for automated tenant provisioning."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the checkout.session.completed event
    if event['type'] == 'checkout.session.completed':
        session_obj = event['data']['object']
        
        # Enqueue the heavy provisioning work to the background ARQ worker
        metadata = session_obj.get("metadata", {})
        customer_id = session_obj.get("customer")
        subscription_id = session_obj.get("subscription")
        
        college_name = metadata.get("college_name")
        college_domain = metadata.get("college_domain")
        admin_email = metadata.get("admin_email")
        plan = metadata.get("plan")
        
        if college_name and college_domain and admin_email:
            from arq import create_pool
            from arq.connections import RedisSettings
            arq_redis = getattr(request.app.state, "arq_redis", None)
            if not arq_redis:
                arq_redis = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
                request.app.state.arq_redis = arq_redis
                
            if arq_redis:
                await arq_redis.enqueue_job(
                    'provision_tenant',
                    college_name=college_name,
                    college_domain=college_domain,
                    admin_email=admin_email,
                    plan=plan,
                    stripe_customer_id=customer_id,
                    stripe_subscription_id=subscription_id
                )
                logger.info(f"Enqueued tenant provisioning for {college_name}")
            else:
                logger.error("Failed to get ARQ redis connection to enqueue provision_tenant task.")
    
    return JSONResponse(status_code=200, content={"status": "success"})
