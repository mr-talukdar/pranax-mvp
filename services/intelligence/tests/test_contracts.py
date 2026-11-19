from datetime import date, datetime, timezone

import pytest
from pydantic import ValidationError

from pranax_intelligence.contracts import AssessmentInput, AssessmentOutput
from pranax_intelligence.engine import assess_retention


def test_input_is_validated_and_output_serializes(assessment_input: AssessmentInput) -> None:
    result = assess_retention(assessment_input)
    serialized = result.model_dump(mode="json")
    assert AssessmentOutput.model_validate(serialized) == result
    assert serialized["assessment_date"] == "2026-01-31"
    assert serialized["scoring_version"] == "retention-v1.0.0"


def test_rejects_naive_attendance_timestamp(assessment_input: AssessmentInput) -> None:
    source = assessment_input.model_dump(mode="json")
    source["attendance"][0]["occurred_at"] = "2025-12-10T10:00:00"
    with pytest.raises(ValidationError):
        AssessmentInput.model_validate(source)


def test_rejects_invalid_iana_timezone(assessment_input: AssessmentInput) -> None:
    with pytest.raises(ValidationError, match="IANA"):
        AssessmentInput.model_validate({**assessment_input.model_dump(), "timezone": "Mars/Olympus"})


def test_rejects_future_attendance(assessment_input: AssessmentInput) -> None:
    source = assessment_input.model_dump(mode="json")
    source["attendance"].append({
        "occurred_at": "2026-02-01T00:30:00+05:30",
        "recorded_at": "2026-02-01T01:00:00+05:30",
        "local_date": "2026-02-01",
    })
    with pytest.raises(ValidationError, match="after assessment_date"):
        AssessmentInput.model_validate(source)


def test_rejects_local_date_mismatch(assessment_input: AssessmentInput) -> None:
    source = assessment_input.model_dump(mode="json")
    source["attendance"][0]["local_date"] = "2025-12-09"
    with pytest.raises(ValidationError, match="studio timezone"):
        AssessmentInput.model_validate(source)


def test_asia_kolkata_local_midnight_boundary(assessment_input: AssessmentInput) -> None:
    source = assessment_input.model_dump(mode="json")
    source["attendance"] = [{
        "occurred_at": "2026-01-30T18:30:00Z",
        "recorded_at": "2026-01-30T18:35:00Z",
        "local_date": "2026-01-31",
    }]
    payload = AssessmentInput.model_validate(source)
    assert assess_retention(payload).dimensions["attendance_recency"].score == 0


@pytest.mark.parametrize(
    ("occurred_at", "local_date"),
    [
        ("2025-03-09T04:59:00Z", "2025-03-08"),
        ("2025-03-09T05:00:00Z", "2025-03-09"),
        ("2025-03-09T07:00:00Z", "2025-03-09"),
    ],
)
def test_dst_local_day_boundaries(occurred_at: str, local_date: str) -> None:
    source = {
        "studio_id": "studio-1",
        "member_id": "member-1",
        "timezone": "America/New_York",
        "assessment_date": "2025-03-09",
        "attendance_coverage": {
            "start_date": "2025-01-09",
            "end_date": "2025-03-09",
            "verified_at": "2025-03-10T03:30:00Z",
            "complete": True,
            "gaps": [],
        },
        "membership_history_complete": True,
        "attendance": [{
            "occurred_at": occurred_at,
            "recorded_at": occurred_at,
            "local_date": local_date,
        }],
        "membership_periods": [{
            "id": "period-current",
            "starts_at": "2025-03-01",
            "original_ends_at": "2025-03-31",
            "effective_ends_at": "2025-03-31",
            "status": "ACTIVE",
            "renewed_from_id": None,
            "recorded_at": "2025-03-01T00:00:00Z",
            "cancelled_at": None,
        }],
    }
    assert AssessmentInput.model_validate(source).attendance[0].local_date.isoformat() == local_date
