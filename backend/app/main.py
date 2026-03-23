from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db_session, init_db
from app.models import (
    CopyRequest,
    DailyActionResponse,
    MarginInput,
    MarginOutput,
    OnboardingRequest,
    RecommendationHistoryEntry,
    SavedProfileResponse,
)
from app.services import build_copy, build_daily_actions, calculate_margin
from app.store import create_profile, get_profile, list_recommendations, record_recommendation, update_profile

init_db()

app = FastAPI(
    title="MONEY BIZ API",
    version="0.2.0",
    description="MVP API for the MONEY BIZ revenue action coach.",
)


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/onboarding/profile", response_model=DailyActionResponse)
def create_onboarding_profile(payload: OnboardingRequest) -> DailyActionResponse:
    return build_daily_actions(payload)


@app.post("/api/business-profiles", response_model=SavedProfileResponse)
def create_business_profile(
    payload: OnboardingRequest,
    session: Session = Depends(get_db_session),
) -> SavedProfileResponse:
    return create_profile(session, payload)


@app.get("/api/business-profiles/{profile_id}", response_model=SavedProfileResponse)
def read_business_profile(
    profile_id: str,
    session: Session = Depends(get_db_session),
) -> SavedProfileResponse:
    profile = get_profile(session, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.put("/api/business-profiles/{profile_id}", response_model=SavedProfileResponse)
def write_business_profile(
    profile_id: str,
    payload: OnboardingRequest,
    session: Session = Depends(get_db_session),
) -> SavedProfileResponse:
    profile = update_profile(session, profile_id, payload)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.post("/api/actions/today", response_model=DailyActionResponse)
def today_actions(payload: OnboardingRequest) -> DailyActionResponse:
    return build_daily_actions(payload)


@app.post("/api/business-profiles/{profile_id}/actions/today", response_model=DailyActionResponse)
def stored_profile_actions(
    profile_id: str,
    session: Session = Depends(get_db_session),
) -> DailyActionResponse:
    profile = get_profile(session, profile_id)
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
    session: Session = Depends(get_db_session),
) -> list[RecommendationHistoryEntry]:
    profile = get_profile(session, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return list_recommendations(session, profile_id, limit=limit)


@app.post("/api/calculator/margin", response_model=MarginOutput)
def margin_calculator(payload: MarginInput) -> MarginOutput:
    return calculate_margin(payload)


@app.post("/api/ai/copy")
def ai_copy(payload: CopyRequest):
    return build_copy(payload)
