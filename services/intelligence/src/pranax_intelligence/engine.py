"""Pure, deterministic retention assessment calculations."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from types import MappingProxyType
from statistics import median
from zoneinfo import ZoneInfo

from .contracts import (
    AssessmentInput,
    AssessmentOutput,
    AssessmentStatus,
    DimensionScore,
    Indicator,
    LifecycleEvent,
    LifecycleEventType,
    LifecycleState,
    MembershipPauseEvidence,
    MembershipPeriodEvidence,
    Recommendation,
    RiskCategory,
)

SCORING_VERSION = "retention-v1.0.0"
DIMENSION_WEIGHTS = MappingProxyType(
    {
        "attendance_recency": 25,
        "attendance_trend_consistency": 35,
        "membership_lifecycle": 25,
        "historical_renewal": 15,
    }
)
GRACE_DAYS = 14


@dataclass(frozen=True)
class _Component:
    score: int | None
    weight: int
    indicators: tuple[Indicator, ...]
    explanation: str


def _round_score(value: Decimal) -> int:
    return int(value.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _category(score: int) -> RiskCategory:
    if score < 30:
        return RiskCategory.LOW
    if score < 60:
        return RiskCategory.MEDIUM
    return RiskCategory.HIGH


def _rolling_year_start(value: date) -> date:
    try:
        return value.replace(year=value.year - 1)
    except ValueError:
        # February 29 falls back to the final day of February in the prior year.
        return value.replace(year=value.year - 1, day=28)


def _local_as_of_timestamp(assessment_date: date, timezone_name: str) -> datetime:
    return datetime.combine(assessment_date, time.max, ZoneInfo(timezone_name))


def _as_of_attendance(payload: AssessmentInput):
    zone = ZoneInfo(payload.timezone)
    as_of = _local_as_of_timestamp(
        payload.assessment_date, payload.timezone
    ).astimezone(timezone.utc)
    return tuple(
        row
        for row in payload.attendance
        if row.local_date <= payload.assessment_date
        and row.occurred_at.astimezone(zone).date() <= payload.assessment_date
        and row.recorded_at.astimezone(timezone.utc) <= as_of
    )


def _known_membership_periods(
    payload: AssessmentInput,
) -> list[MembershipPeriodEvidence]:
    as_of = _local_as_of_timestamp(
        payload.assessment_date, payload.timezone
    ).astimezone(timezone.utc)
    return [
        period
        for period in payload.membership_periods
        if period.recorded_at.astimezone(timezone.utc) <= as_of
    ]


def _known_membership_pauses(payload: AssessmentInput) -> list[MembershipPauseEvidence]:
    as_of = _local_as_of_timestamp(
        payload.assessment_date, payload.timezone
    ).astimezone(timezone.utc)
    return [
        pause
        for pause in payload.membership_pauses
        if pause.recorded_at.astimezone(timezone.utc) <= as_of
    ]


def _cancellation_known(
    payload: AssessmentInput, period: MembershipPeriodEvidence
) -> bool:
    return period.cancelled_at is not None and period.cancelled_at.astimezone(
        timezone.utc
    ) <= (
        _local_as_of_timestamp(payload.assessment_date, payload.timezone).astimezone(
            timezone.utc
        )
    )


def _period_effective_end(
    payload: AssessmentInput, period: MembershipPeriodEvidence
) -> date:
    if _cancellation_known(payload, period):
        return period.effective_ends_at
    extension_days = 0
    for pause in _known_membership_pauses(payload):
        if pause.period_id != period.id or pause.starts_at > payload.assessment_date:
            continue
        extension_end = min(
            pause.resumes_at or payload.assessment_date, payload.assessment_date
        )
        extension_days += max(0, (extension_end - pause.starts_at).days)
    return period.original_ends_at + timedelta(days=extension_days)


def _pause_covers_date(
    payload: AssessmentInput, pause: MembershipPauseEvidence
) -> bool:
    return pause.starts_at <= payload.assessment_date and (
        pause.resumes_at is None or payload.assessment_date < pause.resumes_at
    )


def _eligible_periods(
    payload: AssessmentInput,
) -> tuple[list[MembershipPeriodEvidence], str | None]:
    known = _known_membership_periods(payload)
    known_pauses = _known_membership_pauses(payload)
    current = [
        period
        for period in known
        if period.starts_at
        <= payload.assessment_date
        <= _period_effective_end(payload, period)
        and not (
            _cancellation_known(payload, period)
            and payload.assessment_date >= _period_effective_end(payload, period)
        )
    ]
    paused_ids = {
        pause.period_id for pause in known_pauses if _pause_covers_date(payload, pause)
    }
    if any(period.id in paused_ids for period in current):
        return (
            [],
            "Member has a paused membership and is excluded from active retention assessment.",
        )
    active = [period for period in current if period.id not in paused_ids]
    if len(active) > 1:
        return (
            [],
            "Multiple current active membership periods make lifecycle evidence ambiguous.",
        )
    if not active:
        return [], "No active membership period exists on the assessment date."
    return active, None


def _lifecycle_history(
    payload: AssessmentInput,
    current_periods: list[MembershipPeriodEvidence],
) -> tuple[LifecycleState, tuple[LifecycleEvent, ...]]:
    as_of = _local_as_of_timestamp(
        payload.assessment_date, payload.timezone
    ).astimezone(timezone.utc)
    known = [
        period
        for period in _known_membership_periods(payload)
        if period.starts_at <= payload.assessment_date
    ]
    known_pauses = _known_membership_pauses(payload)
    current_paused = any(
        period.starts_at
        <= payload.assessment_date
        <= _period_effective_end(payload, period)
        and any(
            pause.period_id == period.id and _pause_covers_date(payload, pause)
            for pause in known_pauses
        )
        for period in known
    )
    if current_paused:
        return LifecycleState.PAUSED, ()
    if not payload.membership_history_complete:
        if current_periods:
            return LifecycleState.ACTIVE, ()
        return LifecycleState.UNKNOWN, ()

    known.sort(
        key=lambda period: (period.starts_at, period.effective_ends_at, period.id)
    )
    churns: list[LifecycleEvent] = []
    for period in known:
        effective_end = _period_effective_end(payload, period)
        if _cancellation_known(payload, period):
            if payload.assessment_date >= effective_end:
                churns.append(
                    LifecycleEvent(
                        event_type=LifecycleEventType.CHURN,
                        event_date=effective_end,
                        membership_period_id=period.id,
                    )
                )
            continue
        if payload.assessment_date <= effective_end + timedelta(days=GRACE_DAYS):
            continue
        renewed_within_grace = any(
            candidate.renewed_from_id == period.id
            and candidate.starts_at <= effective_end + timedelta(days=GRACE_DAYS)
            and candidate.recorded_at.astimezone(timezone.utc) <= as_of
            for candidate in payload.membership_periods
        )
        if not renewed_within_grace:
            churns.append(
                LifecycleEvent(
                    event_type=LifecycleEventType.CHURN,
                    event_date=effective_end + timedelta(days=GRACE_DAYS + 1),
                    membership_period_id=period.id,
                )
            )

    reactivations: list[LifecycleEvent] = []
    for churn in churns:
        source = next(
            period for period in known if period.id == churn.membership_period_id
        )
        candidates = [
            period
            for period in known
            if period.id != source.id
            and period.starts_at > source.starts_at
            and period.starts_at >= churn.event_date
        ]
        if candidates:
            next_period = min(
                candidates, key=lambda period: (period.starts_at, period.id)
            )
            reactivations.append(
                LifecycleEvent(
                    event_type=LifecycleEventType.REACTIVATION,
                    event_date=next_period.starts_at,
                    membership_period_id=next_period.id,
                )
            )
    events = tuple(
        sorted(
            (*churns, *reactivations),
            key=lambda event: (
                event.event_date,
                0 if event.event_type == LifecycleEventType.CHURN else 1,
                event.membership_period_id,
            ),
        )
    )

    if current_periods:
        current_id = current_periods[0].id
        if payload.assessment_date == _period_effective_end(
            payload, current_periods[0]
        ) and not _cancellation_known(payload, current_periods[0]):
            return LifecycleState.EXPIRED, events
        if any(
            event.event_type == LifecycleEventType.REACTIVATION
            and event.membership_period_id == current_id
            for event in events
        ):
            return LifecycleState.REACTIVATED, events
        return LifecycleState.ACTIVE, events
    if not known:
        return LifecycleState.UNKNOWN, events

    latest = max(
        known,
        key=lambda period: (period.starts_at, period.effective_ends_at, period.id),
    )
    latest_end = _period_effective_end(payload, latest)
    if _cancellation_known(payload, latest) and payload.assessment_date >= latest_end:
        return LifecycleState.CHURNED, events
    if payload.assessment_date < latest_end:
        return LifecycleState.EXPIRED, events
    if payload.assessment_date <= latest_end + timedelta(days=GRACE_DAYS):
        return LifecycleState.LAPSED, events
    return LifecycleState.CHURNED, events


def _coverage_reasons(payload: AssessmentInput) -> list[str]:
    coverage = payload.attendance_coverage
    reasons: list[str] = []
    if not payload.membership_history_complete:
        reasons.append("Membership period history is not verified as complete.")
    if not coverage.complete:
        reasons.append("Attendance coverage is not verified as complete.")
    if coverage.gaps:
        reasons.append("Attendance coverage contains unexplained gaps.")
    if (
        coverage.start_date is None
        or coverage.end_date is None
        or coverage.verified_at is None
    ):
        reasons.append(
            "Explicit attendance coverage dates and verification are unavailable."
        )
    else:
        if coverage.end_date < payload.assessment_date:
            reasons.append(
                "Verified attendance coverage does not reach the assessment date."
            )
        if coverage.start_date > payload.assessment_date - timedelta(days=59):
            reasons.append(
                "Fewer than 60 calendar days of verified attendance coverage are available."
            )
        if coverage.verified_at.astimezone(timezone.utc) > _local_as_of_timestamp(
            payload.assessment_date, payload.timezone
        ).astimezone(timezone.utc):
            reasons.append(
                "Attendance coverage verification occurred after the assessment date."
            )
    return reasons


def _score_recency(payload: AssessmentInput) -> DimensionScore:
    visits = sorted(row.local_date for row in _as_of_attendance(payload))
    last_visit = visits[-1] if visits else None
    days = (payload.assessment_date - last_visit).days if last_visit else None
    score = (
        100
        if days is None
        else 0
        if days <= 14
        else 30
        if days <= 29
        else 65
        if days <= 44
        else 100
    )

    coverage = payload.attendance_coverage
    baseline_visits = [
        day
        for day in visits
        if payload.assessment_date - timedelta(days=119)
        <= day
        < payload.assessment_date
        and (coverage.start_date is None or day >= coverage.start_date)
        and (coverage.end_date is None or day <= coverage.end_date)
    ]
    intervals = [
        (right - left).days for left, right in zip(baseline_visits, baseline_visits[1:])
    ]
    reliability = "UNAVAILABLE"
    personal_cadence: float | None = None
    if len(intervals) >= 5:
        reliability = "RELIABLE"
        personal_cadence = float(median(intervals))
    elif len(intervals) >= 2:
        reliability = "WEAK"
        personal_cadence = float(median(intervals))

    personal_score = 0
    if reliability == "RELIABLE" and personal_cadence and days is not None:
        ratio = days / personal_cadence
        personal_score = (
            100 if ratio >= 3 else 65 if ratio >= 2 else 30 if ratio >= 1.5 else 0
        )
        score = max(score, personal_score)

    indicators = (
        Indicator(
            "last_attendance",
            "Last attendance",
            last_visit.isoformat() if last_visit else None,
            "Most recent studio-local attendance date available as of the assessment date.",
            last_visit is not None,
        ),
        Indicator(
            "days_since_attendance",
            "Days since attendance",
            days,
            "Calendar-day difference in the studio timezone; unknown when no visit is recorded.",
            days is not None,
        ),
        Indicator(
            "personal_baseline_reliability",
            "Personal cadence baseline",
            reliability,
            "Reliable requires at least five historical visit intervals in the 120-day baseline window; weak evidence is not used to change the score.",
        ),
        Indicator(
            "personal_cadence_days",
            "Historical personal cadence",
            personal_cadence,
            "Median interval between visits in the baseline window, when enough visits exist.",
            personal_cadence is not None,
        ),
        Indicator(
            "absolute_recency_score",
            "Absolute inactivity score",
            100
            if days is None
            else 0
            if days <= 14
            else 30
            if days <= 29
            else 65
            if days <= 44
            else 100,
            "Threshold score from days since attendance; a personal baseline cannot reduce it.",
        ),
    )
    return DimensionScore(
        score=score,
        configured_weight=25,
        applied_weight=0,
        available=True,
        explanation="Absolute inactivity thresholds, increased when a reliable personal cadence indicates earlier deterioration.",
        indicators=indicators,
    )


def _score_decline(payload: AssessmentInput) -> _Component:
    attendance = _as_of_attendance(payload)
    start_recent = payload.assessment_date - timedelta(days=29)
    start_previous = payload.assessment_date - timedelta(days=59)
    recent = sum(
        start_recent <= row.local_date <= payload.assessment_date for row in attendance
    )
    previous = sum(
        start_previous <= row.local_date < start_recent for row in attendance
    )
    if previous == 0:
        return _Component(
            None,
            60,
            (
                Indicator(
                    "attendance_decline_percent",
                    "Attendance decline",
                    None,
                    "Undefined because the previous 30-day period had zero visits.",
                    False,
                ),
                Indicator(
                    "recent_30_day_visits",
                    "Recent 30-day visits",
                    recent,
                    "Attendance records in the recent 30 calendar days.",
                ),
                Indicator(
                    "previous_30_day_visits",
                    "Previous 30-day visits",
                    previous,
                    "Attendance records in the preceding 30 calendar days.",
                ),
            ),
            "Attendance decline is unavailable because there is no previous-period activity baseline.",
        )
    decline = max(0.0, (previous - recent) / previous * 100)
    score = (
        0
        if decline == 0
        else 20
        if decline < 25
        else 45
        if decline < 50
        else 70
        if decline < 75
        else 100
    )
    return _Component(
        score,
        60,
        (
            Indicator(
                "attendance_decline_percent",
                "Attendance decline",
                round(decline, 2),
                "Percentage decrease from previous to recent 30-day attendance; increases are reported as zero decline.",
            ),
            Indicator(
                "recent_30_day_visits",
                "Recent 30-day visits",
                recent,
                "Attendance records in the recent 30 calendar days.",
            ),
            Indicator(
                "previous_30_day_visits",
                "Previous 30-day visits",
                previous,
                "Attendance records in the preceding 30 calendar days.",
            ),
        ),
        "Attendance change is scored against the member's own previous 30-day count.",
    )


def _score_consistency(payload: AssessmentInput) -> _Component:
    attendance = _as_of_attendance(payload)
    recent_start = payload.assessment_date - timedelta(days=29)
    coverage = payload.attendance_coverage
    baseline_start = payload.assessment_date - timedelta(days=119)
    if coverage.start_date is not None:
        baseline_start = max(baseline_start, coverage.start_date)
    baseline_visits = sorted(
        row.local_date
        for row in attendance
        if baseline_start <= row.local_date < recent_start
        and (coverage.end_date is None or row.local_date <= coverage.end_date)
    )
    recent_visits = sorted(
        row.local_date
        for row in attendance
        if recent_start <= row.local_date <= payload.assessment_date
    )
    baseline_intervals = [
        (right - left).days for left, right in zip(baseline_visits, baseline_visits[1:])
    ]
    recent_intervals = [
        (right - left).days for left, right in zip(recent_visits, recent_visits[1:])
    ]
    if len(baseline_intervals) < 5 or not recent_intervals:
        return _Component(
            None,
            40,
            (
                Indicator(
                    "consistency_baseline_intervals",
                    "Baseline visit intervals",
                    len(baseline_intervals),
                    "At least five historical intervals are required for reliable cadence.",
                ),
                Indicator(
                    "recent_visit_intervals",
                    "Recent visit intervals",
                    len(recent_intervals),
                    "Recent intervals are measured between visits in the recent 30-day window.",
                ),
                Indicator(
                    "cadence_deterioration_percent",
                    "Cadence deterioration",
                    None,
                    "Unavailable without a reliable baseline and at least one recent interval.",
                    False,
                ),
            ),
            "Consistency deterioration requires a reliable historical baseline and recent visit interval evidence.",
        )
    baseline = float(median(baseline_intervals))
    recent = float(median(recent_intervals))
    deterioration = max(0.0, (recent - baseline) / baseline * 100) if baseline else 0.0
    # Provisional v1 cadence bands; see service README for calibration caveat.
    score = (
        0
        if deterioration < 25
        else 20
        if deterioration < 50
        else 45
        if deterioration < 100
        else 70
        if deterioration < 200
        else 100
    )
    return _Component(
        score,
        40,
        (
            Indicator(
                "consistency_baseline_days",
                "Baseline cadence",
                baseline,
                "Median interval between visits in the historical 90-day baseline window.",
            ),
            Indicator(
                "recent_cadence_days",
                "Recent cadence",
                recent,
                "Median interval between visits in the recent 30-day window.",
            ),
            Indicator(
                "cadence_deterioration_percent",
                "Cadence deterioration",
                round(deterioration, 2),
                "Positive percentage increase in median visit interval relative to personal baseline.",
            ),
            Indicator(
                "consistency_baseline_intervals",
                "Baseline visit intervals",
                len(baseline_intervals),
                "Five intervals (six visits) are required.",
            ),
            Indicator(
                "recent_visit_intervals",
                "Recent visit intervals",
                len(recent_intervals),
                "At least one interval (two visits) is required.",
            ),
        ),
        "Visit cadence deterioration is compared with the member's personal historical cadence.",
    )


def _score_trend(payload: AssessmentInput) -> DimensionScore:
    decline = _score_decline(payload)
    consistency = _score_consistency(payload)
    available = [
        component for component in (decline, consistency) if component.score is not None
    ]
    if not available:
        return DimensionScore(
            score=None,
            configured_weight=35,
            applied_weight=0,
            available=False,
            explanation="Both attendance decline and consistency are unavailable.",
            indicators=decline.indicators + consistency.indicators,
        )
    scored_components = [
        (component_score, component.weight)
        for component in available
        if (component_score := component.score) is not None
    ]
    total_weight = sum(weight for _, weight in scored_components)
    weighted_score = sum(
        (
            Decimal(component_score) * weight
            for component_score, weight in scored_components
        ),
        start=Decimal(0),
    )
    score = _round_score(weighted_score / total_weight)
    return DimensionScore(
        score=score,
        configured_weight=35,
        applied_weight=0,
        available=True,
        explanation="Attendance decline and cadence consistency use their specified 60/40 weights, redistributed over available components.",
        indicators=decline.indicators + consistency.indicators,
    )


def _score_membership(
    payload: AssessmentInput, active: MembershipPeriodEvidence
) -> DimensionScore:
    known = _known_membership_periods(payload)
    effective_end = _period_effective_end(payload, active)
    linked_renewal = any(
        period.renewed_from_id == active.id
        and period.starts_at <= effective_end + timedelta(days=GRACE_DAYS)
        for period in known
    )
    days = (effective_end - payload.assessment_date).days
    score = (
        0
        if linked_renewal or days > 30
        else 25
        if days >= 15
        else 50
        if days >= 8
        else 100
    )
    current_state, _ = _lifecycle_history(payload, [active])
    return DimensionScore(
        score=score,
        configured_weight=25,
        applied_weight=0,
        available=True,
        explanation="Confirmed, recorded renewal removes expiry risk; otherwise the active period is scored by days until effective expiry.",
        indicators=(
            Indicator(
                "membership_status",
                "Membership status",
                current_state.value,
                "Lifecycle state calculated using evidence available by the assessment date.",
            ),
            Indicator(
                "membership_expiry",
                "Effective membership end",
                effective_end.isoformat(),
                "Effective end date, accounting for recorded cancellation timing.",
            ),
            Indicator(
                "days_until_expiry",
                "Days until expiry",
                days,
                "Calendar-day difference from assessment date to effective end.",
            ),
            Indicator(
                "confirmed_renewal",
                "Confirmed renewal",
                linked_renewal,
                "A recorded renewal period linked to this membership removes expiry risk.",
            ),
            Indicator(
                "cancellation_recorded",
                "Cancellation recorded by assessment date",
                _cancellation_known(payload, active),
                "Cancellation evidence recorded after the assessment date is ignored.",
            ),
        ),
    )


def _score_renewal(payload: AssessmentInput) -> DimensionScore:
    cutoff = _rolling_year_start(payload.assessment_date)
    known_periods = _known_membership_periods(payload)
    effective_ends = {
        period.id: _period_effective_end(payload, period) for period in known_periods
    }
    periods = [
        period
        for period in known_periods
        if cutoff <= effective_ends[period.id] <= payload.assessment_date
        and not _cancellation_known(payload, period)
        and payload.assessment_date
        > effective_ends[period.id] + timedelta(days=GRACE_DAYS)
    ]
    completed = {period.id: period for period in periods}
    renewed = {
        period.renewed_from_id
        for period in known_periods
        if period.renewed_from_id in completed
    }
    count = len(completed)
    non_renewals = sum(period_id not in renewed for period_id in completed)
    if count < 2:
        return DimensionScore(
            score=None,
            configured_weight=15,
            applied_weight=0,
            available=False,
            explanation="At least two completed renewal opportunities in the rolling 12-month window are required.",
            indicators=(
                Indicator(
                    "completed_renewal_opportunities",
                    "Completed renewal opportunities",
                    count,
                    "An opportunity completes only after effective expiry and the 14-day grace period.",
                ),
                Indicator(
                    "non_renewal_rate_percent",
                    "Non-renewal rate",
                    None,
                    "Unavailable with fewer than two completed opportunities.",
                    False,
                ),
            ),
        )
    rate = non_renewals / count * 100
    # Provisional mapping: the non-renewal percentage is itself the risk score.
    score = _round_score(Decimal(str(rate)))
    return DimensionScore(
        score=score,
        configured_weight=15,
        applied_weight=0,
        available=True,
        explanation="In v1, the dimension score is the rounded non-renewal percentage from completed opportunities in the rolling 12-month window.",
        indicators=(
            Indicator(
                "completed_renewal_opportunities",
                "Completed renewal opportunities",
                count,
                "An opportunity completes only after expiry and the 14-day grace period.",
            ),
            Indicator(
                "non_renewal_opportunities",
                "Non-renewal opportunities",
                non_renewals,
                "Completed periods without a recorded renewal.",
            ),
            Indicator(
                "non_renewal_rate_percent",
                "Non-renewal rate",
                round(rate, 2),
                "Non-renewal opportunities divided by completed opportunities.",
            ),
        ),
    )


def _recommend(
    category: RiskCategory, dimensions: dict[str, DimensionScore]
) -> Recommendation:
    def evidence_for(*codes: str) -> tuple[Indicator, ...]:
        selected = set(codes)
        return tuple(
            indicator
            for dimension in dimensions.values()
            for indicator in dimension.indicators
            if indicator.code in selected
        )

    if category == RiskCategory.LOW:
        return Recommendation(
            action="NO_INTERVENTION",
            priority="LOW",
            title="No intervention",
            explanation="Current indicators do not warrant a retention intervention.",
            trigger="LOW_RISK",
        )
    attendance = dimensions["attendance_recency"].score or 0
    trend = dimensions["attendance_trend_consistency"].score or 0
    lifecycle = dimensions["membership_lifecycle"].score or 0
    renewal = dimensions["historical_renewal"].score or 0
    severe_count = sum(value >= 70 for value in (attendance, trend, lifecycle, renewal))
    # Explicit precedence: multiple severe dimensions, prolonged absence, expiry,
    # repeated non-renewal, decline/consistency, then general preventive outreach.
    if category == RiskCategory.HIGH and severe_count >= 2:
        evidence = tuple(
            indicator
            for dimension in dimensions.values()
            if dimension.score is not None and dimension.score >= 70
            for indicator in dimension.indicators
        )
        return Recommendation(
            action="PERSONAL_INTERVENTION",
            priority="HIGH",
            title="Personal intervention",
            explanation="Multiple severe indicators warrant a personal, owner-led review.",
            trigger="MULTIPLE_SEVERE_INDICATORS",
            evidence=evidence,
        )
    if attendance >= 100:
        return Recommendation(
            action="RE_ENGAGEMENT",
            priority="HIGH" if category == RiskCategory.HIGH else "MEDIUM",
            title="Re-engagement",
            explanation="The member has had a prolonged attendance absence.",
            trigger="PROLONGED_ABSENCE",
            evidence=evidence_for("days_since_attendance", "absolute_recency_score"),
        )
    if lifecycle >= 25:
        return Recommendation(
            action="RENEWAL_CONVERSATION",
            priority="HIGH" if category == RiskCategory.HIGH else "MEDIUM",
            title="Renewal conversation",
            explanation="The active membership is approaching expiry.",
            trigger="APPROACHING_EXPIRY",
            evidence=evidence_for("days_until_expiry", "confirmed_renewal"),
        )
    if renewal >= 45:
        return Recommendation(
            action="UNDERSTAND_BARRIERS",
            priority="HIGH" if category == RiskCategory.HIGH else "MEDIUM",
            title="Understand renewal barriers",
            explanation="Several completed renewal opportunities were not renewed.",
            trigger="REPEATED_NON_RENEWALS",
            evidence=evidence_for(
                "non_renewal_rate_percent",
                "completed_renewal_opportunities",
                "non_renewal_opportunities",
            ),
        )
    if trend >= 20:
        return Recommendation(
            action="MEMBER_CHECK_IN",
            priority="HIGH" if category == RiskCategory.HIGH else "MEDIUM",
            title="Check in with the member",
            explanation="Attendance has declined or personal visit cadence has deteriorated.",
            trigger="ATTENDANCE_DECLINE",
            evidence=evidence_for(
                "attendance_decline_percent",
                "cadence_deterioration_percent",
                "recent_30_day_visits",
                "previous_30_day_visits",
            ),
        )
    return Recommendation(
        action="PREVENTIVE_CHECK_IN",
        priority="HIGH" if category == RiskCategory.HIGH else "MEDIUM",
        title="Preventive check-in",
        explanation="A brief supportive check-in may help maintain engagement.",
        trigger="GENERAL_ELEVATED_RISK",
        evidence=tuple(
            indicator
            for dimension in dimensions.values()
            for indicator in dimension.indicators
        ),
    )


def _limited_assessment(
    payload: AssessmentInput,
    assessed_at: datetime,
    reasons: list[str],
) -> AssessmentOutput:
    attendance = _as_of_attendance(payload)
    current_periods, _ = _eligible_periods(payload)
    lifecycle_state, lifecycle_events = _lifecycle_history(payload, current_periods)
    last_visit = max((row.local_date for row in attendance), default=None)
    recent_start = payload.assessment_date - timedelta(days=29)
    previous_start = payload.assessment_date - timedelta(days=59)
    recent_count = sum(
        recent_start <= row.local_date <= payload.assessment_date for row in attendance
    )
    previous_count = sum(
        previous_start <= row.local_date < recent_start for row in attendance
    )
    week_count = sum(
        payload.assessment_date - timedelta(days=6)
        <= row.local_date
        <= payload.assessment_date
        for row in attendance
    )
    known_periods = [
        period
        for period in _known_membership_periods(payload)
        if period.starts_at <= payload.assessment_date
    ]
    latest_period = max(
        known_periods,
        key=lambda period: _period_effective_end(payload, period),
        default=None,
    )
    days_since = (payload.assessment_date - last_visit).days if last_visit else None
    days_until_expiry = (
        (_period_effective_end(payload, latest_period) - payload.assessment_date).days
        if latest_period
        else None
    )
    dimensions = {
        name: DimensionScore(
            score=None,
            configured_weight=weight,
            applied_weight=0,
            available=False,
            explanation="Not scored because full assessment eligibility or evidence coverage is unavailable.",
            indicators=(),
        )
        for name, weight in DIMENSION_WEIGHTS.items()
    }
    indicators = (
        Indicator(
            "last_attendance",
            "Last recorded attendance",
            last_visit.isoformat() if last_visit else None,
            "Most recent supplied studio-local attendance date recorded by the assessment date.",
            last_visit is not None,
        ),
        Indicator(
            "days_since_attendance",
            "Days since recorded attendance",
            days_since,
            "Calendar days since the latest supplied record; this does not establish that attendance coverage is complete.",
            days_since is not None,
        ),
        Indicator(
            "attendance_7_day_count",
            "Recorded attendance in last 7 days",
            week_count,
            "Count of supplied attendance records; zero does not establish inactivity when coverage is incomplete.",
        ),
        Indicator(
            "attendance_30_day_count",
            "Recorded attendance in last 30 days",
            recent_count,
            "Count of supplied attendance records; zero does not establish inactivity when coverage is incomplete.",
        ),
        Indicator(
            "previous_30_day_count",
            "Recorded attendance in previous 30 days",
            previous_count,
            "Count of supplied attendance records; zero does not establish inactivity when coverage is incomplete.",
        ),
        Indicator(
            "membership_status",
            "Membership lifecycle state",
            lifecycle_state.value,
            "Lifecycle state is calculated from membership dates, cancellation timing, and recorded pauses.",
        ),
        Indicator(
            "membership_expiry",
            "Latest known effective membership end",
            _period_effective_end(payload, latest_period).isoformat()
            if latest_period
            else None,
            "Effective end date from the latest known membership period.",
            latest_period is not None,
        ),
        Indicator(
            "days_until_expiry",
            "Days until latest known membership end",
            days_until_expiry,
            "Calendar-day difference when membership period evidence is available.",
            days_until_expiry is not None,
        ),
    )
    return AssessmentOutput(
        studio_id=payload.studio_id,
        member_id=payload.member_id,
        assessment_date=payload.assessment_date,
        assessed_at=assessed_at,
        scoring_version=SCORING_VERSION,
        status=AssessmentStatus.LIMITED,
        is_complete=False,
        lifecycle_state=lifecycle_state,
        lifecycle_events=lifecycle_events,
        score=None,
        category=None,
        dimensions=dimensions,
        indicators=indicators,
        recommendation=Recommendation(
            action="VERIFY_DATA",
            priority="NONE",
            title="Verify member records",
            explanation="A full retention score is unavailable until coverage and membership history are verified.",
            trigger="LIMITED_ASSESSMENT",
            evidence=indicators,
        ),
        completeness_reasons=tuple(reasons),
    )


def assess_retention(payload: AssessmentInput) -> AssessmentOutput:
    """Assess one tenant-scoped member using evidence available as of the date."""
    assessed_at = _local_as_of_timestamp(
        payload.assessment_date, payload.timezone
    ).astimezone(timezone.utc)
    active_periods, exclusion_reason = _eligible_periods(payload)
    lifecycle_state, lifecycle_events = _lifecycle_history(payload, active_periods)
    empty_dimensions = {
        name: DimensionScore(
            score=None,
            configured_weight=weight,
            applied_weight=0,
            available=False,
            explanation="Not calculated because the member is not eligible for active retention assessment.",
            indicators=(),
        )
        for name, weight in DIMENSION_WEIGHTS.items()
    }
    if exclusion_reason and not (
        not payload.membership_history_complete
        and exclusion_reason.startswith("No active membership period")
    ):
        return AssessmentOutput(
            studio_id=payload.studio_id,
            member_id=payload.member_id,
            assessment_date=payload.assessment_date,
            assessed_at=assessed_at,
            scoring_version=SCORING_VERSION,
            status=AssessmentStatus.EXCLUDED,
            is_complete=False,
            lifecycle_state=lifecycle_state,
            lifecycle_events=lifecycle_events,
            score=None,
            category=None,
            dimensions=empty_dimensions,
            indicators=(),
            recommendation=Recommendation(
                action="NO_ASSESSMENT",
                priority="NONE",
                title="Not assessed",
                explanation=exclusion_reason,
                trigger="INELIGIBLE_MEMBERSHIP",
            ),
            completeness_reasons=(exclusion_reason,),
        )

    reasons = _coverage_reasons(payload)
    if exclusion_reason:
        reasons.insert(
            0,
            "Membership history is incomplete, so an active membership period cannot be confirmed.",
        )
    if exclusion_reason:
        return _limited_assessment(payload, assessed_at, reasons)
    recency = _score_recency(payload)
    dimensions = {
        "attendance_recency": recency,
        "attendance_trend_consistency": _score_trend(payload),
        "membership_lifecycle": _score_membership(payload, active_periods[0]),
        "historical_renewal": _score_renewal(payload),
    }
    if reasons:
        return _limited_assessment(payload, assessed_at, reasons)

    scored_dimensions = [
        (dimension_score, DIMENSION_WEIGHTS[name])
        for name, dimension in dimensions.items()
        if (dimension_score := dimension.score) is not None
    ]
    available_weight = sum(weight for _, weight in scored_dimensions)
    if available_weight:
        weighted_score = sum(
            (
                Decimal(dimension_score) * weight
                for dimension_score, weight in scored_dimensions
            ),
            start=Decimal(0),
        )
        score = _round_score(weighted_score / available_weight)
    else:
        score = None
    category = _category(score) if score is not None else None
    for name, dimension in tuple(dimensions.items()):
        if dimension.score is not None:
            dimensions[name] = dimension.model_copy(
                update={
                    "applied_weight": DIMENSION_WEIGHTS[name] / available_weight * 100,
                }
            )
    return AssessmentOutput(
        studio_id=payload.studio_id,
        member_id=payload.member_id,
        assessment_date=payload.assessment_date,
        assessed_at=assessed_at,
        scoring_version=SCORING_VERSION,
        status=AssessmentStatus.COMPLETE,
        is_complete=True,
        lifecycle_state=lifecycle_state,
        lifecycle_events=lifecycle_events,
        score=score,
        category=category,
        dimensions=dimensions,
        indicators=tuple(
            indicator for item in dimensions.values() for indicator in item.indicators
        ),
        recommendation=_recommend(category or RiskCategory.LOW, dimensions),
        completeness_reasons=(),
    )
