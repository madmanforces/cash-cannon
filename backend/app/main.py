from fastapi import FastAPI, HTTPException

from app.models import (
    CopyRequest,
    DailyActionResponse,
    MarginInput,
    MarginOutput,
    OnboardingRequest,
    SavedProfileResponse,
)
from app.services import build_copy, build_daily_actions, calculate_margin
from app.store import create_profile, get_profile, update_profile

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
def create_business_profile(payload: OnboardingRequest) -> SavedProfileResponse:
    return create_profile(payload)


@app.get("/api/business-profiles/{profile_id}", response_model=SavedProfileResponse)
def read_business_profile(profile_id: str) -> SavedProfileResponse:
    profile = get_profile(profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.put("/api/business-profiles/{profile_id}", response_model=SavedProfileResponse)
def write_business_profile(profile_id: str, payload: OnboardingRequest) -> SavedProfileResponse:
    profile = update_profile(profile_id, payload)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.post("/api/actions/today", response_model=DailyActionResponse)
def today_actions(payload: OnboardingRequest) -> DailyActionResponse:
    return build_daily_actions(payload)


@app.post("/api/calculator/margin", response_model=MarginOutput)
def margin_calculator(payload: MarginInput) -> MarginOutput:
    return calculate_margin(payload)


@app.post("/api/ai/copy")
def ai_copy(payload: CopyRequest):
    return build_copy(payload)
