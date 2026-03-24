from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class BusinessType(str, Enum):
    online_seller = "online_seller"
    reservation = "reservation"
    creator = "creator"


class SalesChannel(str, Enum):
    smart_store = "smart_store"
    instagram = "instagram"
    open_market = "open_market"
    kakao = "kakao"
    offline = "offline"


class Tone(str, Enum):
    bold = "bold"
    warm = "warm"
    concise = "concise"


class BusinessProfile(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=60)
    business_type: BusinessType
    channels: list[SalesChannel]
    monthly_goal: int = Field(..., gt=0)
    average_order_value: int = Field(..., gt=0)
    repeat_customer_rate: float = Field(..., ge=0, le=1)


class SalesSnapshot(BaseModel):
    weekly_revenue: int = Field(..., ge=0)
    weekly_orders: int = Field(..., ge=0)
    ad_cost: int = Field(default=0, ge=0)
    coupon_cost: int = Field(default=0, ge=0)
    trend_delta: float = Field(
        default=0,
        ge=-1,
        le=5,
        description="Week-over-week revenue delta. Example: -0.15 means down 15%.",
    )


class OnboardingRequest(BaseModel):
    profile: BusinessProfile
    snapshot: SalesSnapshot


class ActionCard(BaseModel):
    title: str
    reason: str
    expected_impact: str
    checklist: list[str]


class DailyActionResponse(BaseModel):
    focus: str
    actions: list[ActionCard]


class MarginInput(BaseModel):
    sale_price: int = Field(..., gt=0)
    cost: int = Field(..., ge=0)
    fee_rate: float = Field(..., ge=0, le=1)
    ad_cost: int = Field(default=0, ge=0)
    delivery_cost: int = Field(default=0, ge=0)
    coupon_cost: int = Field(default=0, ge=0)
    target_profit: int = Field(default=0, ge=0)


class MarginOutput(BaseModel):
    net_profit: int
    margin_rate: float
    break_even_orders: int
    suggested_price: int


class CopyRequest(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=60)
    offer: str = Field(..., min_length=2, max_length=120)
    channel: SalesChannel
    tone: Tone = Tone.concise
    action_hint: str = Field(default="repeat purchase")


class CopyVariant(BaseModel):
    headline: str
    body: str


class CopyResponse(BaseModel):
    variants: list[CopyVariant]


class SavedProfileResponse(BaseModel):
    profile_id: str
    profile: BusinessProfile
    snapshot: SalesSnapshot
    created_at: datetime
    updated_at: datetime


class RecommendationHistoryEntry(BaseModel):
    id: int
    focus: str
    actions: list[ActionCard]
    created_at: datetime


class AuthSignupRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=60)
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)


class AuthLoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    plan_id: str
    billing_provider: str
    billing_status: str
    billing_portal_available: bool = False
    renewal_date: datetime | None = None


class AuthSessionResponse(BaseModel):
    session_token: str
    user: UserResponse


class BillingPlanResponse(BaseModel):
    id: str
    name: str
    price_monthly_krw: int
    description: str
    features: list[str]


class BillingCheckoutRequest(BaseModel):
    plan_id: str


class BillingCheckoutResponse(BaseModel):
    session_id: str
    provider: str
    plan_id: str
    status: str
    checkout_url: str | None = None


class BillingSessionResponse(BaseModel):
    session_id: str
    provider: str
    plan_id: str
    status: str
    checkout_url: str | None = None
    created_at: datetime
    completed_at: datetime | None = None


class BillingWebhookRequest(BaseModel):
    session_id: str
    event_type: str


class BillingPortalResponse(BaseModel):
    provider: str
    url: str
