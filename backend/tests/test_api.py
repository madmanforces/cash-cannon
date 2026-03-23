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


def test_cors_preflight_for_signup():
    response = client.options(
        "/api/auth/signup",
        headers={
            "Origin": "http://localhost:8081",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-session-token",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:8081"
    assert "POST" in response.headers["access-control-allow-methods"]


def test_signup_login_and_me():
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "full_name": "Kim Builder",
            "email": "kim@example.com",
            "password": "supersecure123",
        },
    )

    token = signup_response.json()["session_token"]
    me_response = client.get("/api/auth/me", headers={"X-Session-Token": token})
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": "kim@example.com",
            "password": "supersecure123",
        },
    )

    assert signup_response.status_code == 200
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "kim@example.com"
    assert login_response.status_code == 200


def test_billing_checkout():
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "full_name": "Plan Buyer",
            "email": "buyer@example.com",
            "password": "supersecure123",
        },
    )
    token = signup_response.json()["session_token"]

    plans_response = client.get("/api/billing/plans")
    checkout_response = client.post(
        "/api/billing/checkout",
        json={"plan_id": "pro"},
        headers={"X-Session-Token": token},
    )

    assert plans_response.status_code == 200
    assert len(plans_response.json()) >= 3
    assert checkout_response.status_code == 200
    assert checkout_response.json()["plan_id"] == "pro"
    assert checkout_response.json()["status"] == "pending"
    assert checkout_response.json()["provider"] == "mock"
    assert checkout_response.json()["checkout_url"].endswith(
        f"/api/billing/mock/checkout/{checkout_response.json()['session_id']}"
    )


def test_mock_checkout_completion_updates_plan():
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "full_name": "Plan Buyer",
            "email": "buyer@example.com",
            "password": "supersecure123",
        },
    )
    token = signup_response.json()["session_token"]

    checkout_response = client.post(
        "/api/billing/checkout",
        json={"plan_id": "pro"},
        headers={"X-Session-Token": token},
    )
    session_id = checkout_response.json()["session_id"]

    session_response = client.get(
        f"/api/billing/checkout-sessions/{session_id}",
        headers={"X-Session-Token": token},
    )
    webhook_response = client.post(
        "/api/billing/webhooks/mock",
        json={"session_id": session_id, "event_type": "checkout.session.completed"},
    )
    me_response = client.get("/api/auth/me", headers={"X-Session-Token": token})

    assert session_response.status_code == 200
    assert session_response.json()["status"] == "pending"
    assert webhook_response.status_code == 200
    assert webhook_response.json()["status"] == "completed"
    assert me_response.status_code == 200
    assert me_response.json()["plan_id"] == "pro"


def test_checkout_session_is_scoped_to_owner():
    owner_signup = client.post(
        "/api/auth/signup",
        json={
            "full_name": "Owner A",
            "email": "checkouta@example.com",
            "password": "supersecure123",
        },
    )
    intruder_signup = client.post(
        "/api/auth/signup",
        json={
            "full_name": "Owner B",
            "email": "checkoutb@example.com",
            "password": "supersecure123",
        },
    )
    owner_token = owner_signup.json()["session_token"]
    intruder_token = intruder_signup.json()["session_token"]

    checkout_response = client.post(
        "/api/billing/checkout",
        json={"plan_id": "team"},
        headers={"X-Session-Token": owner_token},
    )

    session_id = checkout_response.json()["session_id"]
    forbidden_response = client.get(
        f"/api/billing/checkout-sessions/{session_id}",
        headers={"X-Session-Token": intruder_token},
    )

    assert forbidden_response.status_code == 404


def test_free_plan_profile_limit():
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "full_name": "Limited User",
            "email": "limit@example.com",
            "password": "supersecure123",
        },
    )
    token = signup_response.json()["session_token"]

    first_response = client.post(
        "/api/business-profiles",
        json={
            "profile": {
                "business_name": "First Shop",
                "business_type": "online_seller",
                "channels": ["smart_store"],
                "monthly_goal": 3000000,
                "average_order_value": 25000,
                "repeat_customer_rate": 0.21,
            },
            "snapshot": {
                "weekly_revenue": 500000,
                "weekly_orders": 15,
                "ad_cost": 20000,
                "coupon_cost": 5000,
                "trend_delta": 0.03,
            },
        },
        headers={"X-Session-Token": token},
    )
    second_response = client.post(
        "/api/business-profiles",
        json={
            "profile": {
                "business_name": "Second Shop",
                "business_type": "reservation",
                "channels": ["kakao"],
                "monthly_goal": 4500000,
                "average_order_value": 70000,
                "repeat_customer_rate": 0.32,
            },
            "snapshot": {
                "weekly_revenue": 900000,
                "weekly_orders": 11,
                "ad_cost": 15000,
                "coupon_cost": 2000,
                "trend_delta": 0.09,
            },
        },
        headers={"X-Session-Token": token},
    )

    assert first_response.status_code == 200
    assert second_response.status_code == 403


def test_user_cannot_read_another_users_profile():
    owner_signup = client.post(
        "/api/auth/signup",
        json={
            "full_name": "Owner A",
            "email": "ownera@example.com",
            "password": "supersecure123",
        },
    )
    intruder_signup = client.post(
        "/api/auth/signup",
        json={
            "full_name": "Owner B",
            "email": "ownerb@example.com",
            "password": "supersecure123",
        },
    )
    owner_token = owner_signup.json()["session_token"]
    intruder_token = intruder_signup.json()["session_token"]

    create_response = client.post(
        "/api/business-profiles",
        json={
            "profile": {
                "business_name": "Private Shop",
                "business_type": "online_seller",
                "channels": ["instagram"],
                "monthly_goal": 5000000,
                "average_order_value": 33000,
                "repeat_customer_rate": 0.12,
            },
            "snapshot": {
                "weekly_revenue": 650000,
                "weekly_orders": 17,
                "ad_cost": 21000,
                "coupon_cost": 9000,
                "trend_delta": -0.04,
            },
        },
        headers={"X-Session-Token": owner_token},
    )

    profile_id = create_response.json()["profile_id"]
    forbidden_response = client.get(
        f"/api/business-profiles/{profile_id}",
        headers={"X-Session-Token": intruder_token},
    )

    assert forbidden_response.status_code == 404


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
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "full_name": "Northwind Owner",
            "email": "northwind@example.com",
            "password": "supersecure123",
        },
    )
    token = signup_response.json()["session_token"]

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
        headers={"X-Session-Token": token},
    )

    created = create_response.json()
    get_response = client.get(
        f"/api/business-profiles/{created['profile_id']}",
        headers={"X-Session-Token": token},
    )

    assert create_response.status_code == 200
    assert get_response.status_code == 200
    assert get_response.json()["profile"]["business_name"] == "Northwind Studio"


def test_profile_update():
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "full_name": "Cash Garden Owner",
            "email": "cashgarden@example.com",
            "password": "supersecure123",
        },
    )
    token = signup_response.json()["session_token"]

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
        headers={"X-Session-Token": token},
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
        headers={"X-Session-Token": token},
    )

    assert update_response.status_code == 200
    assert update_response.json()["profile"]["monthly_goal"] == 4500000
    assert update_response.json()["snapshot"]["weekly_orders"] == 19


def test_recommendation_history_for_saved_profile():
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "full_name": "Arcade Honey Owner",
            "email": "arcade@example.com",
            "password": "supersecure123",
        },
    )
    token = signup_response.json()["session_token"]

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
        headers={"X-Session-Token": token},
    )
    profile_id = create_response.json()["profile_id"]

    actions_response = client.post(
        f"/api/business-profiles/{profile_id}/actions/today",
        headers={"X-Session-Token": token},
    )
    history_response = client.get(
        f"/api/business-profiles/{profile_id}/recommendations?limit=3",
        headers={"X-Session-Token": token},
    )

    assert actions_response.status_code == 200
    assert history_response.status_code == 200
    assert len(history_response.json()) == 1
    assert history_response.json()[0]["focus"] == "Recovery mode"


def test_free_plan_history_limit_is_enforced():
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "full_name": "History User",
            "email": "history@example.com",
            "password": "supersecure123",
        },
    )
    token = signup_response.json()["session_token"]

    create_response = client.post(
        "/api/business-profiles",
        json={
            "profile": {
                "business_name": "History Shop",
                "business_type": "online_seller",
                "channels": ["instagram"],
                "monthly_goal": 3200000,
                "average_order_value": 22000,
                "repeat_customer_rate": 0.17,
            },
            "snapshot": {
                "weekly_revenue": 480000,
                "weekly_orders": 14,
                "ad_cost": 12000,
                "coupon_cost": 4000,
                "trend_delta": -0.02,
            },
        },
        headers={"X-Session-Token": token},
    )
    profile_id = create_response.json()["profile_id"]

    for _ in range(5):
        client.post(
            f"/api/business-profiles/{profile_id}/actions/today",
            headers={"X-Session-Token": token},
        )

    history_response = client.get(
        f"/api/business-profiles/{profile_id}/recommendations?limit=10",
        headers={"X-Session-Token": token},
    )

    assert history_response.status_code == 200
    assert len(history_response.json()) == 3


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
