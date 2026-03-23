from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db_models import SessionTokenRecord, UserRecord
from app.models import UserResponse
from app.plans import get_plan


def create_user(session: Session, full_name: str, email: str, password: str) -> tuple[str, UserResponse]:
    normalized_email = email.strip().lower()
    existing = session.scalar(select(UserRecord).where(UserRecord.email == normalized_email))
    if existing is not None:
        raise ValueError("Email is already registered")

    user = UserRecord(
        full_name=full_name.strip(),
        email=normalized_email,
        password_hash=_hash_password(password),
        plan_id="free",
        billing_status="active",
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    token = _create_session_token(session, user.id)
    return token, _to_user_response(user)


def authenticate_user(session: Session, email: str, password: str) -> tuple[str, UserResponse]:
    normalized_email = email.strip().lower()
    user = session.scalar(select(UserRecord).where(UserRecord.email == normalized_email))
    if user is None or not _verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password")
    token = _create_session_token(session, user.id)
    return token, _to_user_response(user)


def resolve_user_by_token(session: Session, token: str | None) -> UserRecord | None:
    if not token:
        return None
    session_record = session.scalar(select(SessionTokenRecord).where(SessionTokenRecord.token == token))
    if session_record is None:
        return None
    session_record.last_seen_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(session_record)
    return session_record.user


def revoke_session(session: Session, token: str | None) -> None:
    if not token:
        return
    session_record = session.scalar(select(SessionTokenRecord).where(SessionTokenRecord.token == token))
    if session_record is None:
        return
    session.delete(session_record)
    session.commit()


def update_user_plan(session: Session, user: UserRecord, plan_id: str) -> UserResponse:
    _apply_plan_to_user(user, plan_id)
    session.commit()
    session.refresh(user)
    return _to_user_response(user)


def _apply_plan_to_user(user: UserRecord, plan_id: str) -> None:
    plan = get_plan(plan_id)
    if plan is None:
        raise ValueError("Unknown plan")

    user.plan_id = plan.id
    user.billing_status = "active"
    user.renewal_date = None if plan.id == "free" else datetime.now(timezone.utc) + timedelta(days=30)
    user.updated_at = datetime.now(timezone.utc)


def _create_session_token(session: Session, user_id: int) -> str:
    token = secrets.token_hex(24)
    record = SessionTokenRecord(user_id=user_id, token=token)
    session.add(record)
    session.commit()
    return token


def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()
    return f"{salt}${digest}"


def _verify_password(password: str, password_hash: str) -> bool:
    salt, stored = password_hash.split("$", maxsplit=1)
    digest = hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()
    return secrets.compare_digest(digest, stored)


def _to_user_response(user: UserRecord) -> UserResponse:
    return UserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        plan_id=user.plan_id,
        billing_status=user.billing_status,
        renewal_date=user.renewal_date,
    )
