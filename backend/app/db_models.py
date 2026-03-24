from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class BusinessProfileRecord(Base):
    __tablename__ = "business_profiles"

    profile_id: Mapped[str] = mapped_column(String(12), primary_key=True)
    owner_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    business_name: Mapped[str] = mapped_column(String(60), nullable=False)
    business_type: Mapped[str] = mapped_column(String(32), nullable=False)
    channels: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    monthly_goal: Mapped[int] = mapped_column(Integer, nullable=False)
    average_order_value: Mapped[int] = mapped_column(Integer, nullable=False)
    repeat_customer_rate: Mapped[float] = mapped_column(Float, nullable=False)
    weekly_revenue: Mapped[int] = mapped_column(Integer, nullable=False)
    weekly_orders: Mapped[int] = mapped_column(Integer, nullable=False)
    ad_cost: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    coupon_cost: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    trend_delta: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    recommendations: Mapped[list["RecommendationHistoryRecord"]] = relationship(
        back_populates="profile",
        cascade="all, delete-orphan",
    )
    owner: Mapped["UserRecord | None"] = relationship(back_populates="profiles")


class RecommendationHistoryRecord(Base):
    __tablename__ = "recommendation_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id: Mapped[str] = mapped_column(
        String(12),
        ForeignKey("business_profiles.profile_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    focus: Mapped[str] = mapped_column(String(32), nullable=False)
    actions: Mapped[list[dict[str, object]]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    profile: Mapped[BusinessProfileRecord] = relationship(back_populates="recommendations")


class UserRecord(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(60), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    plan_id: Mapped[str] = mapped_column(String(32), nullable=False, default="free")
    billing_provider: Mapped[str] = mapped_column(String(32), nullable=False, default="internal")
    billing_status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    stripe_customer_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    renewal_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    sessions: Mapped[list["SessionTokenRecord"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    profiles: Mapped[list[BusinessProfileRecord]] = relationship(back_populates="owner")
    billing_sessions: Mapped[list["BillingCheckoutSessionRecord"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class SessionTokenRecord(Base):
    __tablename__ = "session_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    user: Mapped[UserRecord] = relationship(back_populates="sessions")


class BillingCheckoutSessionRecord(Base):
    __tablename__ = "billing_checkout_sessions"

    session_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    provider_reference: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    plan_id: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    checkout_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    user: Mapped[UserRecord] = relationship(back_populates="billing_sessions")
