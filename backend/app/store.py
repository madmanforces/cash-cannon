from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from app.models import OnboardingRequest, SavedProfileResponse

_PROFILE_STORE: dict[str, SavedProfileResponse] = {}


def create_profile(payload: OnboardingRequest) -> SavedProfileResponse:
    now = datetime.now(timezone.utc)
    profile = SavedProfileResponse(
        profile_id=uuid4().hex[:12],
        profile=payload.profile,
        snapshot=payload.snapshot,
        created_at=now,
        updated_at=now,
    )
    _PROFILE_STORE[profile.profile_id] = profile
    return profile


def update_profile(profile_id: str, payload: OnboardingRequest) -> SavedProfileResponse | None:
    existing = _PROFILE_STORE.get(profile_id)
    if existing is None:
        return None

    updated = SavedProfileResponse(
        profile_id=profile_id,
        profile=payload.profile,
        snapshot=payload.snapshot,
        created_at=existing.created_at,
        updated_at=datetime.now(timezone.utc),
    )
    _PROFILE_STORE[profile_id] = updated
    return updated


def get_profile(profile_id: str) -> SavedProfileResponse | None:
    return _PROFILE_STORE.get(profile_id)


def clear_profiles() -> None:
    _PROFILE_STORE.clear()
