from fastapi.testclient import TestClient

from app.database import SessionLocal, init_db
from app.main import app
from app.store import clear_database

client = TestClient(app)
init_db()


def setup_function():
    with SessionLocal() as session:
        clear_database(session)


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
    assert body["focus"] == "Recovery mode"
    assert len(body["actions"]) == 3


def test_profile_create_and_get():
    create_response = client.post(
        "/api/business-profiles",
        json={
            "profile": {
                "business_name": "Northwind Studio",
                "business_type": "reservation",
                "channels": ["instagram", "kakao"],
                "monthly_goal": 4200000,
                "average_order_value": 60000,
                "repeat_customer_rate": 0.42,
            },
            "snapshot": {
                "weekly_revenue": 1100000,
                "weekly_orders": 18,
                "ad_cost": 60000,
                "coupon_cost": 20000,
                "trend_delta": 0.08,
            },
        },
    )

    created = create_response.json()
    get_response = client.get(f"/api/business-profiles/{created['profile_id']}")

    assert create_response.status_code == 200
    assert get_response.status_code == 200
    assert get_response.json()["profile"]["business_name"] == "Northwind Studio"


def test_profile_update():
    create_response = client.post(
        "/api/business-profiles",
        json={
            "profile": {
                "business_name": "Cash Garden",
                "business_type": "creator",
                "channels": ["instagram"],
                "monthly_goal": 3000000,
                "average_order_value": 25000,
                "repeat_customer_rate": 0.2,
            },
            "snapshot": {
                "weekly_revenue": 500000,
                "weekly_orders": 12,
                "ad_cost": 30000,
                "coupon_cost": 10000,
                "trend_delta": -0.05,
            },
        },
    )
    profile_id = create_response.json()["profile_id"]

    update_response = client.put(
        f"/api/business-profiles/{profile_id}",
        json={
            "profile": {
                "business_name": "Cash Garden",
                "business_type": "creator",
                "channels": ["instagram", "smart_store"],
                "monthly_goal": 4500000,
                "average_order_value": 28000,
                "repeat_customer_rate": 0.33,
            },
            "snapshot": {
                "weekly_revenue": 750000,
                "weekly_orders": 19,
                "ad_cost": 45000,
                "coupon_cost": 12000,
                "trend_delta": 0.1,
            },
        },
    )

    assert update_response.status_code == 200
    assert update_response.json()["profile"]["monthly_goal"] == 4500000
    assert update_response.json()["snapshot"]["weekly_orders"] == 19


def test_recommendation_history_for_saved_profile():
    create_response = client.post(
        "/api/business-profiles",
        json={
            "profile": {
                "business_name": "Arcade Honey",
                "business_type": "online_seller",
                "channels": ["smart_store", "instagram"],
                "monthly_goal": 3900000,
                "average_order_value": 31000,
                "repeat_customer_rate": 0.14,
            },
            "snapshot": {
                "weekly_revenue": 720000,
                "weekly_orders": 21,
                "ad_cost": 60000,
                "coupon_cost": 15000,
                "trend_delta": -0.07,
            },
        },
    )
    profile_id = create_response.json()["profile_id"]

    actions_response = client.post(f"/api/business-profiles/{profile_id}/actions/today")
    history_response = client.get(f"/api/business-profiles/{profile_id}/recommendations?limit=3")

    assert actions_response.status_code == 200
    assert history_response.status_code == 200
    assert len(history_response.json()) == 1
    assert history_response.json()[0]["focus"] == "Recovery mode"


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
            "offer": "repeat-purchase coupon",
            "channel": "instagram",
            "tone": "bold",
            "action_hint": "retention",
        },
    )

    body = response.json()
    assert response.status_code == 200
    assert len(body["variants"]) == 3
