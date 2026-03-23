from __future__ import annotations

from app.models import BillingPlanResponse

PROFILE_LIMITS = {
    "free": 1,
    "pro": 3,
    "team": 10,
}

HISTORY_LIMITS = {
    "free": 3,
    "pro": 15,
    "team": 50,
}

PLANS = [
    BillingPlanResponse(
        id="free",
        name="Free",
        price_monthly_krw=0,
        description="For solo operators testing the workflow.",
        features=[
            "1 synced business profile",
            "Up to 3 recommendation history snapshots",
            "Local save fallback",
        ],
    ),
    BillingPlanResponse(
        id="pro",
        name="Pro",
        price_monthly_krw=19900,
        description="For revenue-focused solo operators.",
        features=[
            "Up to 3 synced business profiles",
            "Up to 15 recommendation history snapshots",
            "Expanded action and copy usage",
            "Priority feature access",
        ],
    ),
    BillingPlanResponse(
        id="team",
        name="Team",
        price_monthly_krw=49000,
        description="For small teams managing multiple operators.",
        features=[
            "Up to 10 synced business profiles",
            "Up to 50 recommendation history snapshots",
            "Team-ready growth workflow",
            "Higher operational limits",
        ],
    ),
]


def get_plan(plan_id: str) -> BillingPlanResponse | None:
    for plan in PLANS:
        if plan.id == plan_id:
            return plan
    return None


def get_profile_limit(plan_id: str) -> int:
    return PROFILE_LIMITS.get(plan_id, PROFILE_LIMITS["free"])


def get_history_limit(plan_id: str) -> int:
    return HISTORY_LIMITS.get(plan_id, HISTORY_LIMITS["free"])
