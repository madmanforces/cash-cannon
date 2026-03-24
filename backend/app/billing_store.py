from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db_models import BillingCheckoutSessionRecord, UserRecord
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
    provider_reference: str | None,
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
        provider_reference=provider_reference,
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


def get_checkout_session_by_provider_reference(
    session: Session,
    *,
    provider: str,
    provider_reference: str,
) -> BillingCheckoutSessionRecord | None:
    return session.scalar(
        select(BillingCheckoutSessionRecord).where(
            BillingCheckoutSessionRecord.provider == provider,
            BillingCheckoutSessionRecord.provider_reference == provider_reference,
        )
    )


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
        return complete_checkout_session(session, record, billing_provider=record.provider)
    if payload.event_type == CHECKOUT_EVENT_CANCELED:
        record.status = "canceled"
    elif payload.event_type == CHECKOUT_EVENT_EXPIRED:
        record.status = "expired"
    else:
        raise ValueError("Unknown billing event")

    record.updated_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(record)
    return record


def complete_checkout_session(
    session: Session,
    record: BillingCheckoutSessionRecord,
    *,
    billing_provider: str,
    stripe_customer_id: str | None = None,
    stripe_subscription_id: str | None = None,
) -> BillingCheckoutSessionRecord:
    if record.status == "completed":
        return record

    _apply_plan_to_user(record.user, record.plan_id)
    record.user.billing_provider = billing_provider
    if stripe_customer_id is not None:
        record.user.stripe_customer_id = stripe_customer_id
    if stripe_subscription_id is not None:
        record.user.stripe_subscription_id = stripe_subscription_id
    record.status = "completed"
    record.completed_at = datetime.now(timezone.utc)
    record.updated_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(record)
    return record


def mark_user_subscription_state(
    session: Session,
    *,
    stripe_customer_id: str | None = None,
    stripe_subscription_id: str | None = None,
    billing_status: str,
    renewal_date: datetime | None = None,
) -> UserRecord | None:
    filters = []
    if stripe_subscription_id:
        filters.append(UserRecord.stripe_subscription_id == stripe_subscription_id)
    elif stripe_customer_id:
        filters.append(UserRecord.stripe_customer_id == stripe_customer_id)
    else:
        return None

    user = session.scalar(select(UserRecord).where(*filters))
    if user is None:
        return None

    user.billing_provider = "stripe"
    user.billing_status = billing_status
    user.renewal_date = renewal_date
    user.updated_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(user)
    return user


def cancel_user_subscription(
    session: Session,
    *,
    stripe_customer_id: str | None = None,
    stripe_subscription_id: str | None = None,
) -> UserRecord | None:
    user = mark_user_subscription_state(
        session,
        stripe_customer_id=stripe_customer_id,
        stripe_subscription_id=stripe_subscription_id,
        billing_status="canceled",
        renewal_date=None,
    )
    if user is None:
        return None

    user.plan_id = "free"
    user.stripe_subscription_id = None
    user.updated_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(user)
    return user


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


def _apply_plan_to_user(user: UserRecord, plan_id: str) -> None:
    plan = get_plan(plan_id)
    if plan is None:
        raise ValueError("Unknown plan")

    user.plan_id = plan.id
    user.billing_status = "active"
    user.renewal_date = None if plan.id == "free" else datetime.now(timezone.utc) + timedelta(days=30)
    user.updated_at = datetime.now(timezone.utc)
