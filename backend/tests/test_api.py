from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_healthcheck():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_daily_actions():
    response = client.post(
        "/api/actions/today",
        json={
            "profile": {
                "business_name": "MONEY BIZ",
                "business_type": "online_seller",
                "channels": ["smart_store", "instagram"],
                "monthly_goal": 5000000,
                "average_order_value": 30000,
                "repeat_customer_rate": 0.18,
            },
            "snapshot": {
                "weekly_revenue": 800000,
                "weekly_orders": 27,
                "ad_cost": 130000,
                "coupon_cost": 70000,
                "trend_delta": -0.12,
            },
        },
    )

    body = response.json()
    assert response.status_code == 200
    assert body["focus"] == "회복 모드"
    assert len(body["actions"]) == 3


def test_margin_calculator():
    response = client.post(
        "/api/calculator/margin",
        json={
            "sale_price": 25000,
            "cost": 9000,
            "fee_rate": 0.12,
            "ad_cost": 2000,
            "delivery_cost": 3000,
            "coupon_cost": 1000,
            "target_profit": 100000,
        },
    )

    body = response.json()
    assert response.status_code == 200
    assert body["net_profit"] == 7000
    assert body["break_even_orders"] == 15
    assert body["suggested_price"] >= 25000


def test_copy_generator():
    response = client.post(
        "/api/ai/copy",
        json={
            "business_name": "MONEY BIZ",
            "offer": "재구매 고객 전용 쿠폰",
            "channel": "instagram",
            "tone": "bold",
            "action_hint": "재방문 유도",
        },
    )

    body = response.json()
    assert response.status_code == 200
    assert len(body["variants"]) == 3
