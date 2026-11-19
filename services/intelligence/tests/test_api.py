from fastapi.testclient import TestClient

from pranax_intelligence.main import app


def _request_body(assessment_input) -> dict[str, object]:
    return assessment_input.model_dump(mode="json")


def test_assessment_endpoint_requires_service_token(monkeypatch, assessment_input) -> None:
    monkeypatch.setenv("INTELLIGENCE_SERVICE_TOKEN", "a" * 32)
    response = TestClient(app).post("/api/v1/retention/assess", json=_request_body(assessment_input))
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "unauthorized"


def test_assessment_endpoint_returns_typed_deterministic_result(monkeypatch, assessment_input) -> None:
    token = "service-token-value-that-is-at-least-32-characters"
    monkeypatch.setenv("INTELLIGENCE_SERVICE_TOKEN", token)
    response = TestClient(app).post(
        "/api/v1/retention/assess",
        json=_request_body(assessment_input),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "COMPLETE"
    assert response.json()["scoring_version"] == "retention-v1.0.0"
    assert response.json()["recommendation"]["action"]


def test_assessment_endpoint_rejects_invalid_input_without_echoing_payload(monkeypatch) -> None:
    token = "service-token-value-that-is-at-least-32-characters"
    monkeypatch.setenv("INTELLIGENCE_SERVICE_TOKEN", token)
    response = TestClient(app).post(
        "/api/v1/retention/assess",
        json={"member_id": "private-member-id"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_assessment_input"
    assert "private-member-id" not in response.text


def test_assessment_endpoint_fails_closed_without_configured_token(monkeypatch, assessment_input) -> None:
    monkeypatch.delenv("INTELLIGENCE_SERVICE_TOKEN", raising=False)
    response = TestClient(app).post("/api/v1/retention/assess", json=_request_body(assessment_input))
    assert response.status_code == 503
