from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import delete, desc, select
from sqlalchemy.orm import Session

from app.db_models import BusinessProfileRecord, RecommendationHistoryRecord
from app.models import (
    ActionCard,
    DailyActionResponse,
    OnboardingRequest,
    RecommendationHistoryEntry,
    SavedProfileResponse,
)


def create_profile(session: Session, payload: OnboardingRequest) -> SavedProfileResponse:
    now = datetime.now(timezone.utc)
    record = BusinessProfileRecord(
        profile_id=uuid4().hex[:12],
        business_name=payload.profile.business_name,
        business_type=payload.profile.business_type.value,
        channels=[channel.value for channel in payload.profile.channels],
        monthly_goal=payload.profile.monthly_goal,
        average_order_value=payload.profile.average_order_value,
        repeat_customer_rate=payload.profile.repeat_customer_rate,
        weekly_revenue=payload.snapshot.weekly_revenue,
        weekly_orders=payload.snapshot.weekly_orders,
        ad_cost=payload.snapshot.ad_cost,
        coupon_cost=payload.snapshot.coupon_cost,
        trend_delta=payload.snapshot.trend_delta,
        created_at=now,
        updated_at=now,
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return _to_saved_profile(record)


def update_profile(session: Session, profile_id: str, payload: OnboardingRequest) -> SavedProfileResponse | None:
    record = session.get(BusinessProfileRecord, profile_id)
    if record is None:
        return None

    record.business_name = payload.profile.business_name
    record.business_type = payload.profile.business_type.value
    record.channels = [channel.value for channel in payload.profile.channels]
    record.monthly_goal = payload.profile.monthly_goal
    record.average_order_value = payload.profile.average_order_value
    record.repeat_customer_rate = payload.profile.repeat_customer_rate
    record.weekly_revenue = payload.snapshot.weekly_revenue
    record.weekly_orders = payload.snapshot.weekly_orders
    record.ad_cost = payload.snapshot.ad_cost
    record.coupon_cost = payload.snapshot.coupon_cost
    record.trend_delta = payload.snapshot.trend_delta
    record.updated_at = datetime.now(timezone.utc)

    session.commit()
    session.refresh(record)
    return _to_saved_profile(record)


def get_profile(session: Session, profile_id: str) -> SavedProfileResponse | None:
    record = session.get(BusinessProfileRecord, profile_id)
    if record is None:
        return None
    return _to_saved_profile(record)


def record_recommendation(
    session: Session,
    profile_id: str,
    recommendation: DailyActionResponse,
) -> RecommendationHistoryEntry:
    record = RecommendationHistoryRecord(
        profile_id=profile_id,
        focus=recommendation.focus,
        actions=[
            {
                "title": item.title,
                "reason": item.reason,
                "expected_impact": item.expected_impact,
                "checklist": item.checklist,
            }
            for item in recommendation.actions
        ],
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return _to_history_entry(record)


def list_recommendations(
    session: Session,
    profile_id: str,
    limit: int = 10,
) -> list[RecommendationHistoryEntry]:
    rows = session.scalars(
        select(RecommendationHistoryRecord)
        .where(RecommendationHistoryRecord.profile_id == profile_id)
        .order_by(desc(RecommendationHistoryRecord.created_at), desc(RecommendationHistoryRecord.id))
        .limit(limit)
    ).all()
    return [_to_history_entry(row) for row in rows]


def clear_database(session: Session) -> None:
    session.execute(delete(RecommendationHistoryRecord))
    session.execute(delete(BusinessProfileRecord))
    session.commit()


def _to_saved_profile(record: BusinessProfileRecord) -> SavedProfileResponse:
    return SavedProfileResponse(
        profile_id=record.profile_id,
        profile={
            "business_name": record.business_name,
            "business_type": record.business_type,
            "channels": record.channels,
            "monthly_goal": record.monthly_goal,
            "average_order_value": record.average_order_value,
            "repeat_customer_rate": record.repeat_customer_rate,
        },
        snapshot={
            "weekly_revenue": record.weekly_revenue,
            "weekly_orders": record.weekly_orders,
            "ad_cost": record.ad_cost,
            "coupon_cost": record.coupon_cost,
            "trend_delta": record.trend_delta,
        },
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def _to_history_entry(record: RecommendationHistoryRecord) -> RecommendationHistoryEntry:
    return RecommendationHistoryEntry(
        id=record.id,
        focus=record.focus,
        actions=[
            ActionCard(
                title=item["title"],
                reason=item["reason"],
                expected_impact=item["expected_impact"],
                checklist=item["checklist"],
            )
            for item in record.actions
        ],
        created_at=record.created_at,
    )
