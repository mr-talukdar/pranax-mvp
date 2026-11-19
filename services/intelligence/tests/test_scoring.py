from datetime import date, datetime, timezone
from decimal import Decimal

import pytest

from pranax_intelligence.contracts import AssessmentInput
from pranax_intelligence.engine import (
    _category,
    _score_consistency,
    _score_decline,
    _score_membership,
    _score_recency,
    _score_renewal,
    _score_trend,
    _round_score,
    assess_retention,
)


@pytest.mark.parametrize(
    ("days_ago", "expected"), [(0, 0), (14, 0), (15, 30), (29, 30), (30, 65), (44, 65), (45, 100)]
)
def test_recency_boundaries(assessment_input: AssessmentInput, days_ago: int, expected: int) -> None:
    day = assessment_input.assessment_date.fromordinal(assessment_input.assessment_date.toordinal() - days_ago)
    source = assessment_input.model_dump(mode="json")
    source["attendance"] = [{"occurred_at": f"{day.isoformat()}T10:00:00+05:30", "recorded_at": f"{day.isoformat()}T12:00:00+05:30", "local_date": day.isoformat()}]
    payload = AssessmentInput.model_validate(source)
    assert _score_recency(payload).score == expected


@pytest.mark.parametrize(("days_ago", "expected"), [(6, 30), (8, 65), (12, 100)])
def test_reliable_personal_cadence_can_raise_recency_risk_early(
    assessment_input: AssessmentInput, days_ago: int, expected: int
) -> None:
    source = assessment_input.model_dump(mode="json")
    last_visit = assessment_input.assessment_date.fromordinal(
        assessment_input.assessment_date.toordinal() - days_ago
    )
    dates = [last_visit.fromordinal(last_visit.toordinal() - 4 * index) for index in range(6)]
    source["attendance"] = [
        {
            "occurred_at": f"{visit.isoformat()}T10:00:00+05:30",
            "recorded_at": f"{visit.isoformat()}T12:00:00+05:30",
            "local_date": visit.isoformat(),
        }
        for visit in dates
    ]
    score = _score_recency(AssessmentInput.model_validate(source))
    assert score.score == expected
    assert score.indicators[2].value == "RELIABLE"


def test_weak_and_unavailable_personal_baselines_are_distinguished(
    assessment_input: AssessmentInput,
) -> None:
    source = assessment_input.model_dump(mode="json")
    source["attendance"] = [
        {
            "occurred_at": f"{day}T10:00:00+05:30",
            "recorded_at": f"{day}T12:00:00+05:30",
            "local_date": day,
        }
        for day in ("2025-12-03", "2025-12-10", "2025-12-20", "2026-01-20")
    ]
    weak = _score_recency(AssessmentInput.model_validate(source))
    assert weak.indicators[2].value == "WEAK"
    source["attendance"] = source["attendance"][-2:]
    unavailable = _score_recency(AssessmentInput.model_validate(source))
    assert unavailable.indicators[2].value == "UNAVAILABLE"


def test_unverified_precoverage_visits_do_not_make_personal_baseline_reliable(
    assessment_input: AssessmentInput,
) -> None:
    source = assessment_input.model_dump(mode="json")
    source["attendance"] = [
        {
            "occurred_at": f"{day}T10:00:00+05:30",
            "recorded_at": f"{day}T12:00:00+05:30",
            "local_date": day,
        }
        for day in ("2025-10-10", "2025-10-20", "2025-10-30", "2025-11-10", "2025-11-20", "2026-01-30")
    ]
    result = _score_recency(AssessmentInput.model_validate(source))
    assert result.indicators[2].value == "UNAVAILABLE"


@pytest.mark.parametrize(
    ("recent_count", "expected"), [(12, 0), (10, 20), (8, 45), (5, 70), (2, 100)]
)
def test_decline_boundaries(assessment_input: AssessmentInput, recent_count: int, expected: int) -> None:
    source = assessment_input.model_dump(mode="json")
    recent_start = assessment_input.assessment_date.toordinal() - 29
    previous_start = assessment_input.assessment_date.toordinal() - 59
    visits = [date.fromordinal(previous_start + index).isoformat() for index in range(12)]
    visits += [date.fromordinal(recent_start + index).isoformat() for index in range(recent_count)]
    source["attendance"] = [
        {"occurred_at": f"{day}T10:00:00+05:30", "recorded_at": f"{day}T12:00:00+05:30", "local_date": day} for day in visits
    ]
    payload = AssessmentInput.model_validate(source)
    assert _score_decline(payload).score == expected


@pytest.mark.parametrize(
    ("previous_count", "recent_count", "expected"),
    [(25, 19, 20), (4, 3, 45), (4, 2, 70), (4, 1, 100)],
)
def test_decline_band_edges(
    assessment_input: AssessmentInput, previous_count: int, recent_count: int, expected: int
) -> None:
    source = assessment_input.model_dump(mode="json")
    previous_start = assessment_input.assessment_date.toordinal() - 59
    recent_start = assessment_input.assessment_date.toordinal() - 29
    dates = [date.fromordinal(previous_start + index).isoformat() for index in range(previous_count)]
    dates += [date.fromordinal(recent_start + index).isoformat() for index in range(recent_count)]
    source["attendance"] = [
        {
            "occurred_at": f"{visit}T10:00:00+05:30",
            "recorded_at": f"{visit}T12:00:00+05:30",
            "local_date": visit,
        }
        for visit in dates
    ]
    assert _score_decline(AssessmentInput.model_validate(source)).score == expected


def test_zero_previous_visits_has_undefined_decline(assessment_input: AssessmentInput) -> None:
    source = assessment_input.model_dump(mode="json")
    source["attendance"] = [
        {"occurred_at": "2026-01-10T10:00:00+05:30", "recorded_at": "2026-01-10T12:00:00+05:30", "local_date": "2026-01-10"}
    ]
    result = _score_decline(AssessmentInput.model_validate(source))
    assert result.score is None
    assert result.indicators[0].value is None


def test_attendance_recorded_after_assessment_does_not_leak(assessment_input: AssessmentInput) -> None:
    source = assessment_input.model_dump(mode="json")
    source["attendance"].append({
        "occurred_at": "2026-01-25T10:00:00+05:30",
        "recorded_at": "2026-02-01T10:00:00+05:30",
        "local_date": "2026-01-25",
    })
    payload = AssessmentInput.model_validate(source)
    decline = _score_decline(payload)
    assert decline.indicators[1].value == 3


def test_renewal_recorded_after_assessment_does_not_remove_expiry_risk(assessment_input: AssessmentInput) -> None:
    ends = date(2026, 2, 7)
    current = assessment_input.membership_periods[0].model_copy(
        update={"original_ends_at": ends, "effective_ends_at": ends}
    )
    renewal = current.model_copy(update={
        "id": "future-renewal",
        "starts_at": ends,
        "original_ends_at": date(2026, 3, 7),
        "effective_ends_at": date(2026, 3, 7),
        "renewed_from_id": current.id,
        "recorded_at": datetime(2026, 2, 1, tzinfo=timezone.utc),
    })
    payload = assessment_input.model_copy(update={"membership_periods": (current, renewal)})
    result = _score_membership(payload, current)
    assert result.score == 100


@pytest.mark.parametrize(("recent_interval", "expected"), [(5, 20), (6, 45), (8, 70), (12, 100)])
def test_provisional_consistency_calibration_boundaries(
    assessment_input: AssessmentInput, recent_interval: int, expected: int
) -> None:
    source = assessment_input.model_dump(mode="json")
    baseline_start = assessment_input.assessment_date.fromordinal(
        assessment_input.assessment_date.toordinal() - 119
    )
    recent_start = assessment_input.assessment_date.fromordinal(
        assessment_input.assessment_date.toordinal() - 29
    )
    days: list[date] = []
    day = baseline_start
    while day < recent_start:
        days.append(day)
        day = day.fromordinal(day.toordinal() + 4)
    recent_visit = recent_start.fromordinal(recent_start.toordinal() + 1)
    days.extend((recent_visit, recent_visit.fromordinal(recent_visit.toordinal() + recent_interval)))
    source["attendance"] = [
        {
            "occurred_at": f"{visit.isoformat()}T10:00:00+05:30",
            "recorded_at": f"{visit.isoformat()}T12:00:00+05:30",
            "local_date": visit.isoformat(),
        }
        for visit in days
    ]
    payload = AssessmentInput.model_validate(source)
    assert _score_consistency(payload).score == expected


def test_trend_redistributes_internal_weight_when_decline_is_undefined(
    assessment_input: AssessmentInput,
) -> None:
    source = assessment_input.model_dump(mode="json")
    source["attendance_coverage"]["start_date"] = "2025-10-04"
    baseline_start = date(2025, 10, 5)
    dates = [baseline_start.fromordinal(baseline_start.toordinal() + index * 4) for index in range(12)]
    dates.extend((date(2026, 1, 3), date(2026, 1, 13)))
    source["attendance"] = [
        {
            "occurred_at": f"{visit.isoformat()}T10:00:00+05:30",
            "recorded_at": f"{visit.isoformat()}T12:00:00+05:30",
            "local_date": visit.isoformat(),
        }
        for visit in dates
    ]
    payload = AssessmentInput.model_validate(source)
    trend = _score_trend(payload)
    consistency = _score_consistency(payload)
    assert trend.score == consistency.score
    assert trend.indicators[0].available is False


def test_renewal_needs_two_opportunities_after_grace(assessment_input: AssessmentInput) -> None:
    source = assessment_input.model_dump(mode="json")
    source["membership_periods"].extend([
        {
            "id": "expired-one",
            "starts_at": "2025-01-01",
            "original_ends_at": "2026-01-17",
            "effective_ends_at": "2026-01-17",
            "status": "EXPIRED",
            "renewed_from_id": None,
            "recorded_at": "2025-01-01T00:00:00Z",
            "cancelled_at": None,
        },
        {
            "id": "expired-two",
            "starts_at": "2025-01-01",
            "original_ends_at": "2026-01-17",
            "effective_ends_at": "2026-01-17",
            "status": "EXPIRED",
            "renewed_from_id": None,
            "recorded_at": "2025-01-01T00:00:00Z",
            "cancelled_at": None,
        },
    ])
    payload = AssessmentInput.model_validate(source)
    on_grace_day_14 = _score_renewal(payload)
    assert not on_grace_day_14.available
    after_grace = _score_renewal(payload.model_copy(update={"assessment_date": date(2026, 2, 1)}))
    assert after_grace.available
    assert after_grace.indicators[0].value == 2
    assert after_grace.score == 100


def test_recorded_renewal_counts_as_success(assessment_input: AssessmentInput) -> None:
    source = assessment_input.model_dump(mode="json")
    source["membership_periods"].extend([
        {
            "id": "opportunity-one",
            "starts_at": "2025-01-01",
            "original_ends_at": "2025-04-01",
            "effective_ends_at": "2025-04-01",
            "status": "EXPIRED",
            "renewed_from_id": None,
            "recorded_at": "2025-01-01T00:00:00Z",
            "cancelled_at": None,
        },
        {
            "id": "opportunity-two",
            "starts_at": "2025-05-01",
            "original_ends_at": "2025-08-01",
            "effective_ends_at": "2025-08-01",
            "status": "EXPIRED",
            "renewed_from_id": "opportunity-one",
            "recorded_at": "2025-05-01T00:00:00Z",
            "cancelled_at": None,
        },
    ])
    result = _score_renewal(AssessmentInput.model_validate(source))
    assert result.indicators[0].value == 2
    assert result.indicators[1].value == 1
    assert result.score == 50
    assert result.indicators[2].value == 50


def test_confirmed_renewal_removes_expiry_score(assessment_input: AssessmentInput) -> None:
    current = assessment_input.membership_periods[0].model_copy(
        update={"original_ends_at": date(2026, 2, 7), "effective_ends_at": date(2026, 2, 7)}
    )
    renewal = current.model_copy(update={
        "id": "confirmed-renewal",
        "starts_at": date(2026, 2, 7),
        "original_ends_at": date(2026, 3, 7),
        "effective_ends_at": date(2026, 3, 7),
        "renewed_from_id": current.id,
        "recorded_at": datetime(2026, 1, 30, tzinfo=timezone.utc),
    })
    payload = assessment_input.model_copy(update={"membership_periods": (current, renewal)})
    assert _score_membership(payload, current).score == 0


def test_high_risk_competing_triggers_choose_one_personal_intervention(
    assessment_input: AssessmentInput,
) -> None:
    current = assessment_input.membership_periods[0].model_copy(
        update={
            "original_ends_at": assessment_input.assessment_date,
            "effective_ends_at": assessment_input.assessment_date,
        }
    )
    result = assess_retention(assessment_input.model_copy(update={"attendance": (), "membership_periods": (current,)}))
    assert result.score == 100
    assert result.recommendation.action == "PERSONAL_INTERVENTION"
    assert result.recommendation.trigger == "MULTIPLE_SEVERE_INDICATORS"
    assert result.recommendation.evidence


def test_low_risk_returns_no_intervention(assessment_input: AssessmentInput) -> None:
    result = assess_retention(assessment_input)
    assert result.category.value == "LOW"
    assert result.recommendation.action == "NO_INTERVENTION"


def test_medium_risk_returns_one_preventive_action(assessment_input: AssessmentInput) -> None:
    source = assessment_input.model_dump(mode="json")
    visits = ("2025-12-05", "2025-12-15", "2025-12-25", "2026-01-01", "2026-01-03", "2026-01-06", "2026-01-10")
    source["attendance"] = [
        {
            "occurred_at": f"{visit}T10:00:00+05:30",
            "recorded_at": f"{visit}T12:00:00+05:30",
            "local_date": visit,
        }
        for visit in visits
    ]
    source["membership_periods"][0]["effective_ends_at"] = "2026-03-02"
    result = assess_retention(AssessmentInput.model_validate(source))
    assert result.category.value == "MEDIUM"
    assert result.recommendation.priority == "MEDIUM"
    assert result.recommendation.action == "RE_ENGAGEMENT"


def test_grace_day_twelve_renewal_restores_active_membership(assessment_input: AssessmentInput) -> None:
    source = assessment_input.model_dump(mode="json")
    source["membership_periods"] = [
        {
            "id": "lapsed-period",
            "starts_at": "2025-10-01",
            "original_ends_at": "2026-01-19",
            "effective_ends_at": "2026-01-19",
            "status": "EXPIRED",
            "renewed_from_id": None,
            "recorded_at": "2025-10-01T00:00:00Z",
            "cancelled_at": None,
        },
        {
            "id": "grace-day-12-renewal",
            "starts_at": "2026-01-31",
            "original_ends_at": "2026-02-28",
            "effective_ends_at": "2026-02-28",
            "status": "ACTIVE",
            "renewed_from_id": "lapsed-period",
            "recorded_at": "2026-01-31T00:00:00Z",
            "cancelled_at": None,
        },
    ]
    result = assess_retention(AssessmentInput.model_validate(source))
    assert result.status.value == "COMPLETE"
    assert result.dimensions["historical_renewal"].score is None
    assert result.lifecycle_state.value == "ACTIVE"


def test_multiple_churn_and_reactivation_episodes_are_preserved(
    assessment_input: AssessmentInput,
) -> None:
    source = assessment_input.model_dump(mode="json")
    source["membership_periods"] = [
        {
            "id": "cancelled-one",
            "starts_at": "2024-01-01",
            "original_ends_at": "2024-03-01",
            "effective_ends_at": "2024-03-01",
            "status": "CANCELLED",
            "renewed_from_id": None,
            "recorded_at": "2024-01-01T00:00:00Z",
            "cancelled_at": "2024-02-01T00:00:00Z",
        },
        {
            "id": "reactivation-one",
            "starts_at": "2024-04-01",
            "original_ends_at": "2024-06-01",
            "effective_ends_at": "2024-06-01",
            "status": "EXPIRED",
            "renewed_from_id": "cancelled-one",
            "recorded_at": "2024-04-01T00:00:00Z",
            "cancelled_at": None,
        },
        {
            "id": "reactivation-two",
            "starts_at": "2024-07-01",
            "original_ends_at": "2026-02-28",
            "effective_ends_at": "2026-02-28",
            "status": "ACTIVE",
            "renewed_from_id": "reactivation-one",
            "recorded_at": "2024-07-01T00:00:00Z",
            "cancelled_at": None,
        },
    ]
    result = assess_retention(AssessmentInput.model_validate(source))
    assert result.lifecycle_state.value == "REACTIVATED"
    assert [event.event_type.value for event in result.lifecycle_events] == [
        "CHURN", "REACTIVATION", "CHURN", "REACTIVATION"
    ]
    assert [event.membership_period_id for event in result.lifecycle_events] == [
        "cancelled-one", "reactivation-one", "reactivation-one", "reactivation-two"
    ]


@pytest.mark.parametrize(("days", "expected"), [(31, 0), (30, 25), (15, 25), (14, 50), (8, 50), (7, 100), (0, 100)])
def test_membership_expiry_thresholds(assessment_input: AssessmentInput, days: int, expected: int) -> None:
    period = assessment_input.membership_periods[0].model_copy(
        update={
            "original_ends_at": assessment_input.assessment_date.fromordinal(assessment_input.assessment_date.toordinal() + days),
            "effective_ends_at": assessment_input.assessment_date.fromordinal(assessment_input.assessment_date.toordinal() + days),
        }
    )
    result = _score_membership(assessment_input, period)
    assert result.score == expected


@pytest.mark.parametrize(("score", "category"), [(0, "LOW"), (29, "LOW"), (30, "MEDIUM"), (59, "MEDIUM"), (60, "HIGH"), (100, "HIGH")])
def test_risk_category_boundaries(score: int, category: str) -> None:
    assert _category(score).value == category


def test_overall_score_and_response_are_deterministic(assessment_input: AssessmentInput) -> None:
    first = assess_retention(assessment_input)
    second = assess_retention(assessment_input)
    assert first == second
    assert first.score is not None and 0 <= first.score <= 100
    assert sum(dimension.applied_weight for dimension in first.dimensions.values()) == pytest.approx(100)
    assert first.dimensions["historical_renewal"].applied_weight == 0
    assert first.dimensions["attendance_recency"].applied_weight == pytest.approx(25 / 85 * 100)


def test_multiple_unavailable_dimensions_are_excluded(assessment_input: AssessmentInput) -> None:
    result = assess_retention(assessment_input.model_copy(update={"attendance": ()}))
    assert result.status.value == "COMPLETE"
    assert result.dimensions["attendance_trend_consistency"].score is None
    assert result.dimensions["historical_renewal"].score is None
    assert result.dimensions["attendance_recency"].applied_weight == 50
    assert result.dimensions["membership_lifecycle"].applied_weight == 50


def test_score_rounding_uses_decimal_half_up() -> None:
    assert _round_score(Decimal("2.5")) == 3
    assert _round_score(Decimal("2.49")) == 2


def test_personal_baseline_increases_but_does_not_reduce_absolute_score(assessment_input: AssessmentInput) -> None:
    source = assessment_input.model_dump(mode="json")
    source["attendance"] = [
        {"occurred_at": f"{day}T10:00:00+05:30", "recorded_at": f"{day}T12:00:00+05:30", "local_date": day}
        for day in ("2025-12-21", "2025-12-25", "2025-12-29", "2026-01-02", "2026-01-06", "2026-01-10")
    ]
    source["attendance_coverage"]["start_date"] = "2025-12-03"
    result = _score_recency(AssessmentInput.model_validate(source))
    assert result.score == 100
    assert result.indicators[-1].value == 30
