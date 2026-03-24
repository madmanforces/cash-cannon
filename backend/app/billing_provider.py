from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Protocol

try:
    import stripe
except ImportError:  # pragma: no cover - dependency is installed in normal app/test runs
    stripe = None  # type: ignore[assignment]


@dataclass(frozen=True)
class ProviderCheckoutSession:
    checkout_url: str
    provider_reference: str | None = None


@dataclass(frozen=True)
class ProviderPortalSession:
    url: str


class BillingProvider(Protocol):
    provider_id: str

    def create_checkout_session(
        self,
        *,
        app_session_id: str,
        plan_id: str,
        user_email: str,
        api_base_url: str,
    ) -> ProviderCheckoutSession:
        """Create a provider-hosted checkout session."""

    def create_customer_portal_session(self, *, customer_id: str, return_url: str) -> ProviderPortalSession:
        """Create a provider-hosted billing portal session."""


class MockBillingProvider:
    provider_id = "mock"

    def create_checkout_session(
        self,
        *,
        app_session_id: str,
        plan_id: str,
        user_email: str,
        api_base_url: str,
    ) -> ProviderCheckoutSession:
        del plan_id, user_email
        return ProviderCheckoutSession(
            checkout_url=f"{api_base_url.rstrip('/')}/api/billing/mock/checkout/{app_session_id}",
            provider_reference=app_session_id,
        )

    def create_customer_portal_session(self, *, customer_id: str, return_url: str) -> ProviderPortalSession:
        del customer_id, return_url
        raise ValueError("Customer portal is not available for the mock provider")


class StripeBillingProvider:
    provider_id = "stripe"

    def __init__(self) -> None:
        stripe_module = get_stripe_module()
        self.stripe = stripe_module
        secret_key = os.getenv("STRIPE_SECRET_KEY", "").strip()
        if not secret_key:
            raise ValueError("STRIPE_SECRET_KEY is required when BILLING_PROVIDER=stripe")
        self.stripe.api_key = secret_key

    def create_checkout_session(
        self,
        *,
        app_session_id: str,
        plan_id: str,
        user_email: str,
        api_base_url: str,
    ) -> ProviderCheckoutSession:
        del api_base_url
        price_id = _get_stripe_price_id(plan_id)
        session = self.stripe.checkout.Session.create(
            success_url=f"{get_frontend_app_url()}/?billing=stripe_success",
            cancel_url=f"{get_frontend_app_url()}/?billing=stripe_cancel",
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            customer_email=user_email,
            client_reference_id=app_session_id,
            metadata={
                "app_session_id": app_session_id,
                "plan_id": plan_id,
            },
        )
        return ProviderCheckoutSession(
            checkout_url=session.url,
            provider_reference=session.id,
        )

    def create_customer_portal_session(self, *, customer_id: str, return_url: str) -> ProviderPortalSession:
        session = self.stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        return ProviderPortalSession(url=session.url)


def get_billing_provider(provider_id: str | None = None) -> BillingProvider:
    selected = (provider_id or get_billing_provider_name()).strip().lower()
    if selected == "mock":
        return MockBillingProvider()
    if selected == "stripe":
        return StripeBillingProvider()
    raise ValueError("Unknown billing provider")


def get_billing_provider_name() -> str:
    return os.getenv("BILLING_PROVIDER", "mock").strip().lower()


def get_frontend_app_url() -> str:
    return os.getenv("FRONTEND_APP_URL", "http://localhost:8081").rstrip("/")


def get_stripe_module() -> Any:
    if stripe is None:
        raise ValueError("Stripe SDK is not installed")
    return stripe


def get_stripe_webhook_secret() -> str | None:
    secret = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
    return secret or None


def _get_stripe_price_id(plan_id: str) -> str:
    if plan_id == "free":
        raise ValueError("Use the billing portal to manage downgrades to Free")

    mapping = {
        "pro": os.getenv("STRIPE_PRICE_ID_PRO", "").strip(),
        "team": os.getenv("STRIPE_PRICE_ID_TEAM", "").strip(),
    }
    price_id = mapping.get(plan_id, "")
    if not price_id:
        raise ValueError(f"Missing Stripe price ID for {plan_id}")
    return price_id
