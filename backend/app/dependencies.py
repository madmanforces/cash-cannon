from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.auth_store import resolve_user_by_token
from app.database import get_db_session
from app.db_models import UserRecord


def get_optional_user(
    session: Session = Depends(get_db_session),
    x_session_token: Annotated[str | None, Header(alias="X-Session-Token")] = None,
) -> UserRecord | None:
    return resolve_user_by_token(session, x_session_token)


def get_current_user(user: UserRecord | None = Depends(get_optional_user)) -> UserRecord:
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user
