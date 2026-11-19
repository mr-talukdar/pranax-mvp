from datetime import date, datetime, timezone

import pytest

from pranax_intelligence.contracts import AssessmentInput, AssessmentStatus, MembershipPauseEvidence
from pranax_intelligence.engine import assess_retention


def test_sixty_calendar_days_of_coverage_is_full(assessment_input: AssessmentInput) -> None:
    result = assess_retention(assessment_input)
    assert result.status == AssessmentStatus.COMPLETE
    assert result.score is not None


def test_fifty_nine_days_produces_limited_assessment(assessment_input: AssessmentInput) -> None:
    coverage = assessment_input.attendance_coverage.model_copy(update={"start_date": date(2025, 12, 4)})
    result = assess_retention(assessment_input.model_copy(update={"attendance_coverage": coverage}))
    assert result.status == AssessmentStatus.LIMITED
    assert result.score is None
    assert any("Fewer than 60" in reason for reason in result.completeness_reasons)


def test_zero_visits_with_complete_coverage_is_valid_inactivity(assessment_input: AssessmentInput) -> None:
    result = assess_retention(assessment_input.model_copy(update={"attendance": ()}))
    assert result.status == AssessmentStatus.COMPLETE
    assert result.dimensions["attendance_recency"].score == 100
    assert result.dimensions["attendance_recency"].indicators[0].value is None


def test_incomplete_coverage_is_limited_not_zero_activity(assessment_input: AssessmentInput) -> None:
    coverage = assessment_input.attendance_coverage.model_copy(update={"complete": False})
    result = assess_retention(assessment_input.model_copy(update={"attendance_coverage": coverage, "attendance": ()}))
    assert result.status == AssessmentStatus.LIMITED
    assert result.score is None
    indicators = {indicator.code: indicator for indicator in result.indicators}
    assert indicators["last_attendance"].value is None
    assert indicators["attendance_30_day_count"].value == 0
    assert "absolute_recency_score" not in indicators


def test_missing_coverage_verification_is_limited(assessment_input: AssessmentInput) -> None:
    coverage = assessment_input.attendance_coverage.model_copy(
        update={"end_date": None, "verified_at": None, "complete": False}
    )
    result = assess_retention(assessment_input.model_copy(update={"attendance_coverage": coverage}))
    assert result.status == AssessmentStatus.LIMITED
    assert result.score is None


def test_coverage_gap_produces_limited_assessment(assessment_input: AssessmentInput) -> None:
    coverage = assessment_input.attendance_coverage.model_copy(
        update={"gaps": ({"start_date": date(2026, 1, 1), "end_date": date(2026, 1, 2)},)}
    )
    result = assess_retention(assessment_input.model_copy(update={"attendance_coverage": coverage}))
    assert result.status == AssessmentStatus.LIMITED
    assert any("gaps" in reason for reason in result.completeness_reasons)


def test_paused_member_is_excluded(assessment_input: AssessmentInput) -> None:
    period = assessment_input.membership_periods[0].model_copy(update={"status": "PAUSED"})
    pause = MembershipPauseEvidence(
        id="pause-1",
        period_id=period.id,
        starts_at=assessment_input.assessment_date,
        resumes_at=None,
        recorded_at=datetime(2026, 1, 30, tzinfo=timezone.utc),
    )
    result = assess_retention(assessment_input.model_copy(
        update={"membership_periods": (period,), "membership_pauses": (pause,)}
    ))
    assert result.status == AssessmentStatus.EXCLUDED
    assert result.score is None
    assert result.lifecycle_state.value == "PAUSED"


def test_expired_member_is_outside_active_assessment_population(assessment_input: AssessmentInput) -> None:
    ended = date(2026, 1, 11)
    period = assessment_input.membership_periods[0].model_copy(
        update={"status": "EXPIRED", "original_ends_at": ended, "effective_ends_at": ended}
    )
    result = assess_retention(assessment_input.model_copy(update={"membership_periods": (period,)}))
    assert result.status == AssessmentStatus.EXCLUDED
    assert result.lifecycle_state.value == "CHURNED"


@pytest.mark.parametrize(
    ("end_date", "state"),
    [(date(2026, 1, 30), "LAPSED"), (date(2026, 1, 17), "LAPSED"), (date(2026, 1, 16), "CHURNED")],
)
def test_expiry_grace_lifecycle_boundaries(
    assessment_input: AssessmentInput, end_date: date, state: str
) -> None:
    period = assessment_input.membership_periods[0].model_copy(update={
        "status": "EXPIRED",
        "original_ends_at": end_date,
        "effective_ends_at": end_date,
    })
    result = assess_retention(assessment_input.model_copy(update={"membership_periods": (period,)}))
    assert result.status == AssessmentStatus.EXCLUDED
    assert result.lifecycle_state.value == state


def test_unknown_membership_history_is_limited(assessment_input: AssessmentInput) -> None:
    result = assess_retention(
        assessment_input.model_copy(update={"membership_periods": (), "membership_history_complete": False})
    )
    assert result.status == AssessmentStatus.LIMITED
    assert result.score is None
    assert any("Membership history is incomplete" in reason for reason in result.completeness_reasons)


def test_future_effective_cancellation_remains_active_until_effective_end(
    assessment_input: AssessmentInput,
) -> None:
    period = assessment_input.membership_periods[0].model_copy(update={
        "status": "CANCELLED",
        "cancelled_at": datetime(2026, 1, 15, 12, tzinfo=timezone.utc),
    })
    result = assess_retention(assessment_input.model_copy(update={"membership_periods": (period,)}))
    assert result.status == AssessmentStatus.COMPLETE
    assert result.dimensions["membership_lifecycle"].score == 25
    assert result.lifecycle_state.value == "ACTIVE"


def test_immediate_cancellation_is_not_active_on_effective_date(
    assessment_input: AssessmentInput,
) -> None:
    period = assessment_input.membership_periods[0].model_copy(update={
        "status": "CANCELLED",
        "effective_ends_at": assessment_input.assessment_date,
        "cancelled_at": datetime(2026, 1, 31, 12, tzinfo=timezone.utc),
    })
    result = assess_retention(assessment_input.model_copy(update={"membership_periods": (period,)}))
    assert result.status == AssessmentStatus.EXCLUDED
    assert result.lifecycle_state.value == "CHURNED"


def test_cancellation_recorded_after_as_of_date_does_not_leak(
    assessment_input: AssessmentInput,
) -> None:
    period = assessment_input.membership_periods[0].model_copy(update={
        "status": "CANCELLED",
        "effective_ends_at": date(2026, 1, 15),
        "cancelled_at": datetime(2026, 2, 2, tzinfo=timezone.utc),
    })
    result = assess_retention(assessment_input.model_copy(update={"membership_periods": (period,)}))
    assert result.status == AssessmentStatus.COMPLETE
    assert result.lifecycle_state.value == "ACTIVE"
    assert result.dimensions["membership_lifecycle"].score == 25
    assert result.dimensions["membership_lifecycle"].indicators[-1].value is False


def test_recorded_pause_extends_effective_expiry(assessment_input: AssessmentInput) -> None:
    period = assessment_input.membership_periods[0]
    pause = MembershipPauseEvidence(
        id="completed-pause",
        period_id=period.id,
        starts_at=date(2026, 1, 1),
        resumes_at=date(2026, 1, 11),
        recorded_at=datetime(2025, 12, 31, tzinfo=timezone.utc),
    )
    result = assess_retention(assessment_input.model_copy(update={"membership_pauses": (pause,)}))
    assert result.dimensions["membership_lifecycle"].score == 0
    assert result.dimensions["membership_lifecycle"].indicators[1].value == "2026-03-10"


def test_pause_recorded_after_assessment_does_not_leak(assessment_input: AssessmentInput) -> None:
    source = assessment_input.model_dump(mode="json")
    source["membership_periods"][0]["status"] = "PAUSED"
    source["membership_pauses"] = [{
        "id": "future-pause",
        "period_id": "period-current",
        "starts_at": "2026-01-31",
        "resumes_at": None,
        "recorded_at": "2026-02-02T00:00:00Z",
    }]
    result = assess_retention(AssessmentInput.model_validate(source))
    assert result.status == AssessmentStatus.COMPLETE
    assert result.lifecycle_state.value == "ACTIVE"
