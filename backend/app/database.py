from __future__ import annotations

import os
from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./money_biz.db")


class Base(DeclarativeBase):
    pass


connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, future=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def init_db() -> None:
    from app.db_models import BusinessProfileRecord, RecommendationHistoryRecord, SessionTokenRecord, UserRecord  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _run_lightweight_migrations()


def get_db_session() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _run_lightweight_migrations() -> None:
    inspector = inspect(engine)
    if "business_profiles" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("business_profiles")}
    if "owner_user_id" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE business_profiles ADD COLUMN owner_user_id INTEGER"))
