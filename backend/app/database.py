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
    from app.db_models import (  # noqa: F401
        BillingCheckoutSessionRecord,
        BusinessProfileRecord,
        RecommendationHistoryRecord,
        SessionTokenRecord,
        UserRecord,
    )

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
    table_names = inspector.get_table_names()

    if "business_profiles" in table_names:
        columns = {column["name"] for column in inspector.get_columns("business_profiles")}
        if "owner_user_id" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE business_profiles ADD COLUMN owner_user_id INTEGER"))

    if "users" in table_names:
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        user_column_statements = {
            "billing_provider": "ALTER TABLE users ADD COLUMN billing_provider VARCHAR(32) NOT NULL DEFAULT 'internal'",
            "stripe_customer_id": "ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(64)",
            "stripe_subscription_id": "ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR(64)",
        }
        for column_name, statement in user_column_statements.items():
            if column_name not in user_columns:
                with engine.begin() as connection:
                    connection.execute(text(statement))

    if "billing_checkout_sessions" in table_names:
        checkout_columns = {column["name"] for column in inspector.get_columns("billing_checkout_sessions")}
        if "provider_reference" not in checkout_columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE billing_checkout_sessions ADD COLUMN provider_reference VARCHAR(64)"))
