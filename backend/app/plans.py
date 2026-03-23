from __future__ import annotations

from app.models import BillingPlanResponse

PLANS = [
    BillingPlanResponse(
        id="free",
        name="Free",
        price_monthly_krw=0,
        description="For solo operators testing the workflow.",
        features=[
            "Single business profile",
            "Basic dashboard and action refresh",
            "Local save fallback",
        ],
    ),
    BillingPlanResponse(
        id="pro",
        name="Pro",
        price_monthly_krw=19900,
        description="For revenue-focused solo operators.",
        features=[
            "Unlimited dashboard refresh history",
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
            "Shared access for small teams",
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
