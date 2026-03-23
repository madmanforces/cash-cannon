from __future__ import annotations

from typing import Protocol


class BillingProvider(Protocol):
    provider_id: str

    def build_checkout_url(self, session_id: str, base_url: str) -> str:
        """Build a provider-hosted checkout URL for the given session."""


class MockBillingProvider:
    provider_id = "mock"

    def build_checkout_url(self, session_id: str, base_url: str) -> str:
        return f"{base_url.rstrip('/')}/api/billing/mock/checkout/{session_id}"


def get_billing_provider(provider_id: str = "mock") -> BillingProvider:
    if provider_id == "mock":
        return MockBillingProvider()
    raise ValueError("Unknown billing provider")
