from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db_models import BillingCheckoutSessionRecord
from app.models import BillingCheckoutResponse, BillingSessionResponse, BillingWebhookRequest
from app.plans import get_plan

CHECKOUT_EVENT_COMPLETED = "checkout.session.completed"
CHECKOUT_EVENT_CANCELED = "checkout.session.canceled"
CHECKOUT_EVENT_EXPIRED = "checkout.session.expired"
TERMINAL_CHECKOUT_STATUSES = {"completed", "canceled", "expired"}


def create_checkout_session(
    session: Session,
    *,
    session_id: str,
    user_id: int,
    provider: str,
    plan_id: str,
    checkout_url: str | None,
) -> BillingCheckoutSessionRecord:
    plan = get_plan(plan_id)
    if plan is None:
        raise ValueError("Unknown plan")

    now = datetime.now(timezone.utc)
    record = BillingCheckoutSessionRecord(
        session_id=session_id,
        user_id=user_id,
        provider=provider,
        plan_id=plan.id,
        status="pending",
        checkout_url=checkout_url,
        created_at=now,
        updated_at=now,
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def get_checkout_session(
    session: Session,
    session_id: str,
    owner_user_id: int | None = None,
) -> BillingCheckoutSessionRecord | None:
    filters = [BillingCheckoutSessionRecord.session_id == session_id]
    if owner_user_id is not None:
        filters.append(BillingCheckoutSessionRecord.user_id == owner_user_id)
    return session.scalar(select(BillingCheckoutSessionRecord).where(*filters))


def apply_billing_webhook(
    session: Session,
    payload: BillingWebhookRequest,
) -> BillingCheckoutSessionRecord:
    record = session.get(BillingCheckoutSessionRecord, payload.session_id)
    if record is None:
        raise ValueError("Checkout session not found")

    if record.status in TERMINAL_CHECKOUT_STATUSES:
        return record

    if payload.event_type == CHECKOUT_EVENT_COMPLETED:
        _apply_plan_to_user(record.user, record.plan_id)
        record.status = "completed"
        record.completed_at = datetime.now(timezone.utc)
    elif payload.event_type == CHECKOUT_EVENT_CANCELED:
        record.status = "canceled"
    elif payload.event_type == CHECKOUT_EVENT_EXPIRED:
        record.status = "expired"
    else:
        raise ValueError("Unknown billing event")

    record.updated_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(record)
    return record


def to_checkout_response(record: BillingCheckoutSessionRecord) -> BillingCheckoutResponse:
    return BillingCheckoutResponse(
        session_id=record.session_id,
        provider=record.provider,
        plan_id=record.plan_id,
        status=record.status,
        checkout_url=record.checkout_url,
    )


def to_session_response(record: BillingCheckoutSessionRecord) -> BillingSessionResponse:
    return BillingSessionResponse(
        session_id=record.session_id,
        provider=record.provider,
        plan_id=record.plan_id,
        status=record.status,
        checkout_url=record.checkout_url,
        created_at=record.created_at,
        completed_at=record.completed_at,
    )


def _apply_plan_to_user(user, plan_id: str) -> None:
    plan = get_plan(plan_id)
    if plan is None:
        raise ValueError("Unknown plan")

    user.plan_id = plan.id
    user.billing_status = "active"
    user.renewal_date = None if plan.id == "free" else datetime.now(timezone.utc) + timedelta(days=30)
    user.updated_at = datetime.now(timezone.utc)
