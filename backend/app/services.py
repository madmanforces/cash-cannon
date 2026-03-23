from __future__ import annotations

import math

from app.models import (
    ActionCard,
    BusinessProfile,
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
                title="이번 주 하락 원인을 반영한 긴급 캠페인 실행",
                reason="주간 매출이 감소 중이라 빠른 노출 회복 액션이 필요합니다.",
                expected_impact="저관여 고객 유입과 즉시성 매출 회복",
                checklist=[
                    "할인 대신 세트 상품 또는 보너스 혜택으로 구성 변경",
                    "대표 채널에 오늘 안에 업로드할 홍보 문구 발행",
                    "캠페인 반응을 24시간 안에 다시 점검",
                ],
            )
        )

    if profile.repeat_customer_rate < 0.3:
        actions.append(
            ActionCard(
                title="재구매 고객 리텐션 메시지 발송",
                reason="반복 구매 비율이 낮아 재방문 유도가 우선입니다.",
                expected_impact="광고비를 늘리지 않고 매출 회수율 개선",
                checklist=[
                    "최근 30일 구매 고객군을 분리",
                    "감사 메시지 + 기간 한정 혜택 문구 발송",
                    "응답률이 높은 시간대에 1회 발송",
                ],
            )
        )

    fee_burden = snapshot.ad_cost + snapshot.coupon_cost
    if fee_burden > profile.average_order_value * max(snapshot.weekly_orders, 1) * 0.1:
        actions.append(
            ActionCard(
                title="마진 방어를 위한 가격/혜택 구조 조정",
                reason="광고와 쿠폰 비용 비중이 높아 순이익이 압박받고 있습니다.",
                expected_impact="주문 수 유지와 마진율 개선의 균형 확보",
                checklist=[
                    "기본 가격은 유지하고 묶음 옵션을 추가",
                    "광고 효율이 낮은 소재를 중단",
                    "쿠폰은 신규 고객군에만 제한 적용",
                ],
            )
        )

    while len(actions) < 3:
        actions.append(
            ActionCard(
                title="채널별 주간 콘텐츠 1건 예약",
                reason="지속적인 노출은 단기 매출 하락 방어에 유효합니다.",
                expected_impact="문의 증가와 브랜드 기억 강화",
                checklist=[
                    "후기 기반 메시지 1개 선정",
                    "대표 이미지 또는 썸네일 1개 준비",
                    "주 고객 활동 시간에 예약 발행",
                ],
            )
        )

    focus = (
        "회복 모드"
        if snapshot.trend_delta < 0
        else "리텐션 모드"
        if profile.repeat_customer_rate < 0.3
        else "확장 모드"
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
        Tone.bold: "지금 바로 놓치면 아쉬운",
        Tone.warm: "고객에게 부담 없이 다가가는",
        Tone.concise: "짧고 바로 이해되는",
    }[payload.tone]

    variants = [
        CopyVariant(
            headline=f"{payload.business_name} {payload.offer}",
            body=(
                f"{tone_prefix} {channel_name}용 문구입니다. "
                f"{payload.action_hint}에 초점을 맞춰 오늘 안에 바로 게시해 보세요."
            ),
        ),
        CopyVariant(
            headline=f"다시 찾게 만드는 {payload.offer}",
            body=(
                f"{payload.business_name}만의 강점을 한 문장으로 정리하고, "
                f"'{payload.offer}' 혜택을 선명하게 보여 주세요."
            ),
        ),
        CopyVariant(
            headline=f"이번 주 반응을 끌어올릴 {payload.offer}",
            body=(
                f"{channel_name} 채널 특성상 첫 문장에서 혜택을 명확히 제시하고 "
                f"마지막에는 행동 유도 문장을 넣는 편이 유리합니다."
            ),
        ),
    ]
    return CopyResponse(variants=variants)


def _channel_label(channel: SalesChannel) -> str:
    labels = {
        SalesChannel.smart_store: "스마트스토어",
        SalesChannel.instagram: "인스타그램",
        SalesChannel.open_market: "오픈마켓",
        SalesChannel.kakao: "카카오",
        SalesChannel.offline: "오프라인",
    }
    return labels[channel]
