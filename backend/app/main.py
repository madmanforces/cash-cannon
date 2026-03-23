import os
import secrets
from html import escape

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.auth_store import authenticate_user, create_user, revoke_session
from app.billing_provider import get_billing_provider
from app.billing_store import (
    CHECKOUT_EVENT_CANCELED,
    CHECKOUT_EVENT_COMPLETED,
    apply_billing_webhook,
    create_checkout_session,
    get_checkout_session,
    to_checkout_response,
    to_session_response,
)
from app.database import get_db_session, init_db
from app.db_models import UserRecord
from app.dependencies import get_current_user
from app.models import (
    AuthLoginRequest,
    AuthSessionResponse,
    AuthSignupRequest,
    BillingCheckoutRequest,
    BillingCheckoutResponse,
    BillingPlanResponse,
    BillingSessionResponse,
    BillingWebhookRequest,
    CopyRequest,
    DailyActionResponse,
    MarginInput,
    MarginOutput,
    OnboardingRequest,
    RecommendationHistoryEntry,
    SavedProfileResponse,
    UserResponse,
)
from app.plans import PLANS, get_history_limit, get_plan, get_profile_limit
from app.services import build_copy, build_daily_actions, calculate_margin
from app.store import (
    count_profiles_for_user,
    create_profile,
    get_latest_profile_for_user,
    get_owned_profile,
    list_recommendations,
    record_recommendation,
    update_profile,
)


def _get_cors_allow_origins() -> list[str]:
    configured = os.getenv("CORS_ALLOW_ORIGINS", "")
    values = [origin.strip() for origin in configured.split(",")]
    return [origin for origin in values if origin]


init_db()

app = FastAPI(
    title="MONEY BIZ API",
    version="0.2.0",
    description="MVP API for the MONEY BIZ revenue action coach.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_cors_allow_origins(),
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/signup", response_model=AuthSessionResponse)
def signup(
    payload: AuthSignupRequest,
    session: Session = Depends(get_db_session),
) -> AuthSessionResponse:
    try:
        session_token, user = create_user(session, payload.full_name, payload.email, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return AuthSessionResponse(session_token=session_token, user=user)


@app.post("/api/auth/login", response_model=AuthSessionResponse)
def login(
    payload: AuthLoginRequest,
    session: Session = Depends(get_db_session),
) -> AuthSessionResponse:
    try:
        session_token, user = authenticate_user(session, payload.email, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    return AuthSessionResponse(session_token=session_token, user=user)


@app.get("/api/auth/me", response_model=UserResponse)
def me(current_user: UserRecord = Depends(get_current_user)) -> UserResponse:
    return UserResponse(
        id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        plan_id=current_user.plan_id,
        billing_status=current_user.billing_status,
        renewal_date=current_user.renewal_date,
    )


@app.post("/api/auth/logout")
def logout(
    x_session_token: str | None = Header(default=None, alias="X-Session-Token"),
    session: Session = Depends(get_db_session),
) -> dict[str, str]:
    revoke_session(session, x_session_token)
    return {"status": "ok"}


@app.get("/api/billing/plans", response_model=list[BillingPlanResponse])
def billing_plans() -> list[BillingPlanResponse]:
    return PLANS


@app.post("/api/billing/checkout", response_model=BillingCheckoutResponse)
def billing_checkout(
    payload: BillingCheckoutRequest,
    request: Request,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> BillingCheckoutResponse:
    try:
        provider = get_billing_provider("mock")
        session_id = secrets.token_hex(16)
        checkout_url = provider.build_checkout_url(session_id, str(request.base_url).rstrip("/"))
        checkout = create_checkout_session(
            session,
            session_id=session_id,
            user_id=current_user.id,
            provider=provider.provider_id,
            plan_id=payload.plan_id,
            checkout_url=checkout_url,
        )
        return to_checkout_response(checkout)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/billing/checkout-sessions/{session_id}", response_model=BillingSessionResponse)
def billing_checkout_session(
    session_id: str,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> BillingSessionResponse:
    checkout = get_checkout_session(session, session_id, owner_user_id=current_user.id)
    if checkout is None:
        raise HTTPException(status_code=404, detail="Checkout session not found")
    return to_session_response(checkout)


@app.post("/api/billing/webhooks/mock", response_model=BillingSessionResponse)
def mock_billing_webhook(
    payload: BillingWebhookRequest,
    session: Session = Depends(get_db_session),
) -> BillingSessionResponse:
    try:
        checkout = apply_billing_webhook(session, payload)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if message == "Checkout session not found" else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
    return to_session_response(checkout)


@app.get("/api/billing/mock/checkout/{session_id}", response_class=HTMLResponse)
def mock_checkout_page(
    session_id: str,
    session: Session = Depends(get_db_session),
) -> HTMLResponse:
    checkout = get_checkout_session(session, session_id)
    if checkout is None:
        raise HTTPException(status_code=404, detail="Checkout session not found")
    return HTMLResponse(_render_mock_checkout(checkout))


@app.post("/api/billing/mock/checkout/{session_id}/complete", response_class=HTMLResponse)
def mock_checkout_complete(
    session_id: str,
    session: Session = Depends(get_db_session),
) -> HTMLResponse:
    return _apply_mock_checkout_event(session, session_id, CHECKOUT_EVENT_COMPLETED)


@app.post("/api/billing/mock/checkout/{session_id}/cancel", response_class=HTMLResponse)
def mock_checkout_cancel(
    session_id: str,
    session: Session = Depends(get_db_session),
) -> HTMLResponse:
    return _apply_mock_checkout_event(session, session_id, CHECKOUT_EVENT_CANCELED)


@app.post("/api/onboarding/profile", response_model=DailyActionResponse)
def create_onboarding_profile(payload: OnboardingRequest) -> DailyActionResponse:
    return build_daily_actions(payload)


@app.post("/api/business-profiles", response_model=SavedProfileResponse)
def create_business_profile(
    payload: OnboardingRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> SavedProfileResponse:
    if count_profiles_for_user(session, current_user.id) >= get_profile_limit(current_user.plan_id):
        raise HTTPException(status_code=403, detail="Profile limit reached for the current plan")
    return create_profile(session, payload, owner_user_id=current_user.id)


@app.get("/api/business-profiles/me/latest", response_model=SavedProfileResponse)
def latest_business_profile(
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> SavedProfileResponse:
    profile = get_latest_profile_for_user(session, current_user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.get("/api/business-profiles/{profile_id}", response_model=SavedProfileResponse)
def read_business_profile(
    profile_id: str,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> SavedProfileResponse:
    profile = get_owned_profile(session, profile_id, current_user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.put("/api/business-profiles/{profile_id}", response_model=SavedProfileResponse)
def write_business_profile(
    profile_id: str,
    payload: OnboardingRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> SavedProfileResponse:
    existing = get_owned_profile(session, profile_id, current_user.id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile = update_profile(session, profile_id, payload, owner_user_id=current_user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.post("/api/actions/today", response_model=DailyActionResponse)
def today_actions(payload: OnboardingRequest) -> DailyActionResponse:
    return build_daily_actions(payload)


@app.post("/api/business-profiles/{profile_id}/actions/today", response_model=DailyActionResponse)
def stored_profile_actions(
    profile_id: str,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> DailyActionResponse:
    profile = get_owned_profile(session, profile_id, current_user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    payload = OnboardingRequest(profile=profile.profile, snapshot=profile.snapshot)
    recommendation = build_daily_actions(payload)
    record_recommendation(session, profile_id, recommendation)
    return recommendation


@app.get("/api/business-profiles/{profile_id}/recommendations", response_model=list[RecommendationHistoryEntry])
def recommendation_history(
    profile_id: str,
    limit: int = 5,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> list[RecommendationHistoryEntry]:
    profile = get_owned_profile(session, profile_id, current_user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    safe_limit = min(limit, get_history_limit(current_user.plan_id))
    return list_recommendations(session, profile_id, limit=safe_limit)


@app.post("/api/calculator/margin", response_model=MarginOutput)
def margin_calculator(payload: MarginInput) -> MarginOutput:
    return calculate_margin(payload)


@app.post("/api/ai/copy")
def ai_copy(payload: CopyRequest):
    return build_copy(payload)


def _apply_mock_checkout_event(session: Session, session_id: str, event_type: str) -> HTMLResponse:
    try:
        checkout = apply_billing_webhook(session, BillingWebhookRequest(session_id=session_id, event_type=event_type))
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if message == "Checkout session not found" else 400
        raise HTTPException(status_code=status_code, detail=message) from exc

    action_text = "completed" if checkout.status == "completed" else "canceled"
    plan = get_plan(checkout.plan_id)
    amount = "Free" if plan is not None and plan.price_monthly_krw == 0 else f"KRW {plan.price_monthly_krw:,}/mo"
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>MONEY BIZ Mock Checkout</title>
        <style>
          body {{
            margin: 0;
            font-family: Arial, sans-serif;
            background: linear-gradient(180deg, #08111e 0%, #173357 100%);
            color: #f7f1e8;
          }}
          main {{
            max-width: 560px;
            margin: 40px auto;
            padding: 28px;
            border-radius: 24px;
            background: rgba(247, 241, 232, 0.09);
            border: 1px solid rgba(255, 255, 255, 0.08);
          }}
          a {{
            color: #9bf3d0;
          }}
        </style>
      </head>
      <body>
        <main>
          <p>Mock checkout {escape(action_text)}.</p>
          <h1>{escape(checkout.plan_id.upper())} plan</h1>
          <p>Status: {escape(checkout.status)}</p>
          <p>Price: {escape(amount)}</p>
          <p>Return to the MONEY BIZ app and press Refresh status in the Account screen.</p>
          <p><a href="{escape(checkout.checkout_url or '')}">Back to checkout page</a></p>
        </main>
      </body>
    </html>
    """
    return HTMLResponse(html)


def _render_mock_checkout(checkout) -> str:
    plan = get_plan(checkout.plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Unknown plan")

    price = "Free" if plan.price_monthly_krw == 0 else f"KRW {plan.price_monthly_krw:,}/month"
    status_line = "Complete the purchase to activate the plan." if checkout.status == "pending" else "This checkout session is already closed."
    action_row = (
        f"""
        <div class="actions">
          <form method="post" action="/api/billing/mock/checkout/{escape(checkout.session_id)}/complete">
            <button class="primary" type="submit">Approve payment</button>
          </form>
          <form method="post" action="/api/billing/mock/checkout/{escape(checkout.session_id)}/cancel">
            <button class="secondary" type="submit">Cancel</button>
          </form>
        </div>
        """
        if checkout.status == "pending"
        else ""
    )
    return f"""
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>MONEY BIZ Mock Checkout</title>
        <style>
          body {{
            margin: 0;
            font-family: Arial, sans-serif;
            background: linear-gradient(180deg, #08111e 0%, #173357 100%);
            color: #f7f1e8;
          }}
          main {{
            max-width: 640px;
            margin: 40px auto;
            padding: 28px;
            border-radius: 24px;
            background: rgba(247, 241, 232, 0.09);
            border: 1px solid rgba(255, 255, 255, 0.08);
          }}
          .eyebrow {{
            color: #9bf3d0;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            font-size: 12px;
          }}
          .price {{
            display: inline-block;
            margin-top: 16px;
            padding: 8px 12px;
            border-radius: 999px;
            background: #ff8e63;
            color: #08111e;
            font-weight: 700;
          }}
          .status {{
            margin-top: 16px;
            color: #ffbe9f;
          }}
          .actions {{
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 24px;
          }}
          button {{
            border: none;
            border-radius: 999px;
            padding: 14px 18px;
            font-weight: 700;
            cursor: pointer;
          }}
          .primary {{
            background: #ff8e63;
            color: #08111e;
          }}
          .secondary {{
            background: rgba(255, 255, 255, 0.12);
            color: #f7f1e8;
          }}
        </style>
      </head>
      <body>
        <main>
          <p class="eyebrow">Mock Provider</p>
          <h1>{escape(plan.name)} for MONEY BIZ</h1>
          <p>{escape(plan.description)}</p>
          <p class="price">{escape(price)}</p>
          <p class="status">Session {escape(checkout.session_id)} is currently {escape(checkout.status)}.</p>
          <p>{escape(status_line)}</p>
          {action_row}
        </main>
      </body>
    </html>
    """
