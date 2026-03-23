from fastapi import FastAPI

from app.models import CopyRequest, DailyActionResponse, MarginInput, MarginOutput, OnboardingRequest
from app.services import build_copy, build_daily_actions, calculate_margin

app = FastAPI(
    title="MONEY BIZ API",
    version="0.1.0",
    description="Initial MVP API for the MONEY BIZ revenue action coach.",
)


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/onboarding/profile", response_model=DailyActionResponse)
def create_profile(payload: OnboardingRequest) -> DailyActionResponse:
    return build_daily_actions(payload)


@app.post("/api/actions/today", response_model=DailyActionResponse)
def today_actions(payload: OnboardingRequest) -> DailyActionResponse:
    return build_daily_actions(payload)


@app.post("/api/calculator/margin", response_model=MarginOutput)
def margin_calculator(payload: MarginInput) -> MarginOutput:
    return calculate_margin(payload)


@app.post("/api/ai/copy")
def ai_copy(payload: CopyRequest):
    return build_copy(payload)
