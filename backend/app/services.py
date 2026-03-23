from __future__ import annotations

import math

from app.models import (
    ActionCard,
    CopyResponse,
    CopyVariant,
    DailyActionResponse,
    MarginInput,
    MarginOutput,
    OnboardingRequest,
    SalesChannel,
    Tone,
)


def build_daily_actions(payload: OnboardingRequest) -> DailyActionResponse:
    profile = payload.profile
    snapshot = payload.snapshot
    actions: list[ActionCard] = []

    if snapshot.trend_delta < 0:
        actions.append(
            ActionCard(
                title="Launch a recovery campaign today",
                reason="Revenue is trending down, so the business needs a fast visibility reset.",
                expected_impact="Short-term demand recovery and more top-of-funnel interest",
                checklist=[
                    "Keep price intact and repackage the offer as a bundle or bonus",
                    "Publish one strong campaign message on the top channel today",
                    "Review response within 24 hours and adjust the angle quickly",
                ],
            )
        )

    if profile.repeat_customer_rate < 0.3:
        actions.append(
            ActionCard(
                title="Send a repeat-purchase retention message",
                reason="Repeat purchase rate is low, so retention should come before new acquisition.",
                expected_impact="Higher revenue recovery without increasing ad spend",
                checklist=[
                    "Segment customers who purchased in the last 30 days",
                    "Send a thank-you message with a narrow, time-bound incentive",
                    "Schedule the message for the best response window",
                ],
            )
        )

    fee_burden = snapshot.ad_cost + snapshot.coupon_cost
    if fee_burden > profile.average_order_value * max(snapshot.weekly_orders, 1) * 0.1:
        actions.append(
            ActionCard(
                title="Adjust the price-to-benefit structure",
                reason="Ad spend and coupon cost are squeezing contribution margin.",
                expected_impact="Protect order volume while improving unit economics",
                checklist=[
                    "Add a higher-value bundle before cutting the base price",
                    "Pause low-efficiency ad creatives first",
                    "Restrict coupons to first-time or reactivation segments",
                ],
            )
        )

    while len(actions) < 3:
        actions.append(
            ActionCard(
                title="Queue one channel-specific content asset",
                reason="Consistent exposure helps stabilize demand and inquiry volume.",
                expected_impact="More inbound interest and steadier weekly traffic",
                checklist=[
                    "Choose one customer proof point or review",
                    "Pair it with one simple image or thumbnail",
                    "Schedule it at the audience's most active time",
                ],
            )
        )

    focus = (
        "Recovery mode"
        if snapshot.trend_delta < 0
        else "Retention mode"
        if profile.repeat_customer_rate < 0.3
        else "Growth mode"
    )
    return DailyActionResponse(focus=focus, actions=actions[:3])


def calculate_margin(payload: MarginInput) -> MarginOutput:
    fee_amount = int(payload.sale_price * payload.fee_rate)
    net_profit = (
        payload.sale_price
        - payload.cost
        - fee_amount
        - payload.ad_cost
        - payload.delivery_cost
        - payload.coupon_cost
    )
    margin_rate = round(net_profit / payload.sale_price, 4)
    per_order_profit = max(net_profit, 1)
    break_even_orders = math.ceil(payload.target_profit / per_order_profit) if payload.target_profit else 0
    suggested_price = payload.sale_price
    if net_profit < payload.target_profit and payload.target_profit > 0:
        suggested_price = math.ceil(
            (
                payload.target_profit
                + payload.cost
                + payload.ad_cost
                + payload.delivery_cost
                + payload.coupon_cost
            )
            / (1 - payload.fee_rate)
        )

    return MarginOutput(
        net_profit=net_profit,
        margin_rate=margin_rate,
        break_even_orders=break_even_orders,
        suggested_price=suggested_price,
    )


def build_copy(payload) -> CopyResponse:
    channel_name = _channel_label(payload.channel)
    tone_prefix = {
        Tone.bold: "A sharp, urgent",
        Tone.warm: "A customer-friendly",
        Tone.concise: "A direct, lightweight",
    }[payload.tone]

    variants = [
        CopyVariant(
            headline=f"{payload.business_name} | {payload.offer}",
            body=(
                f"{tone_prefix} {channel_name} message focused on {payload.action_hint}. "
                f"Use this version when you want immediate action."
            ),
        ),
        CopyVariant(
            headline=f"Bring customers back with {payload.offer}",
            body=(
                f"Lead with the business benefit, name the offer clearly, "
                f"and close with a simple call to action."
            ),
        ),
        CopyVariant(
            headline=f"This week's conversion lift: {payload.offer}",
            body=(
                f"For {channel_name}, put the value proposition in the first line "
                f"and keep the last sentence action-oriented."
            ),
        ),
    ]
    return CopyResponse(variants=variants)


def _channel_label(channel: SalesChannel) -> str:
    labels = {
        SalesChannel.smart_store: "Smart Store",
        SalesChannel.instagram: "Instagram",
        SalesChannel.open_market: "Open Market",
        SalesChannel.kakao: "Kakao",
        SalesChannel.offline: "Offline",
    }
    return labels[channel]
