from fastapi import Depends, FastAPI, Header, HTTPException
from sqlalchemy.orm import Session

from app.auth_store import authenticate_user, create_user, revoke_session, update_user_plan
from app.database import get_db_session, init_db
from app.db_models import UserRecord
from app.dependencies import get_current_user
from app.models import (
    AuthLoginRequest,
    AuthSessionResponse,
    AuthSignupRequest,
    BillingCheckoutRequest,
    BillingPlanResponse,
    CopyRequest,
    DailyActionResponse,
    MarginInput,
    MarginOutput,
    OnboardingRequest,
    RecommendationHistoryEntry,
    SavedProfileResponse,
    UserResponse,
)
from app.plans import PLANS, get_history_limit, get_profile_limit
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

init_db()

app = FastAPI(
    title="MONEY BIZ API",
    version="0.2.0",
    description="MVP API for the MONEY BIZ revenue action coach.",
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


@app.post("/api/billing/checkout", response_model=UserResponse)
def billing_checkout(
    payload: BillingCheckoutRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> UserResponse:
    try:
        return update_user_plan(session, current_user, payload.plan_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


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
