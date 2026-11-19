"""Validated input and output contracts for deterministic retention assessment."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from enum import StrEnum
from typing import Annotated
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class MembershipStatus(StrEnum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class CoverageGap(StrictModel):
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def validate_range(self) -> CoverageGap:
        if self.end_date < self.start_date:
            raise ValueError("coverage gap end_date must not precede start_date")
        return self


class AttendanceCoverage(StrictModel):
    start_date: date | None
    end_date: date | None
    verified_at: datetime | None
    complete: bool
    gaps: tuple[CoverageGap, ...] = Field(default=(), max_length=1000)

    @model_validator(mode="after")
    def validate_coverage(self) -> AttendanceCoverage:
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("coverage end_date must not precede start_date")
        if self.verified_at is not None and self.verified_at.utcoffset() is None:
            raise ValueError("coverage verified_at must include a timezone")
        return self


class AttendanceEvidence(StrictModel):
    occurred_at: datetime
    recorded_at: datetime
    local_date: date

    @field_validator("occurred_at", "recorded_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.utcoffset() is None:
            raise ValueError("attendance occurred_at must include a timezone")
        return value


class MembershipPeriodEvidence(StrictModel):
    id: str = Field(min_length=1, max_length=100)
    starts_at: date
    original_ends_at: date
    effective_ends_at: date
    status: MembershipStatus
    renewed_from_id: str | None = None
    recorded_at: datetime
    cancelled_at: datetime | None = None

    @field_validator("recorded_at", "cancelled_at")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.utcoffset() is None:
            raise ValueError("membership timestamps must include a timezone")
        return value

    @model_validator(mode="after")
    def validate_dates(self) -> MembershipPeriodEvidence:
        if self.original_ends_at < self.starts_at:
            raise ValueError("membership original_ends_at must not precede starts_at")
        if self.effective_ends_at < self.starts_at:
            raise ValueError("membership effective_ends_at must not precede starts_at")
        if self.status == MembershipStatus.CANCELLED and self.cancelled_at is None:
            raise ValueError("cancelled membership periods must include cancelled_at")
        return self


class MembershipPauseEvidence(StrictModel):
    id: str = Field(min_length=1, max_length=100)
    period_id: str = Field(min_length=1, max_length=100)
    starts_at: date
    resumes_at: date | None = None
    recorded_at: datetime

    @field_validator("recorded_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.utcoffset() is None:
            raise ValueError("membership pause recorded_at must include a timezone")
        return value

    @model_validator(mode="after")
    def validate_range(self) -> MembershipPauseEvidence:
        if self.resumes_at is not None and self.resumes_at < self.starts_at:
            raise ValueError("membership pause resumes_at must not precede starts_at")
        return self


class AssessmentInput(StrictModel):
    studio_id: str = Field(min_length=1, max_length=100)
    member_id: str = Field(min_length=1, max_length=100)
    timezone: str = Field(min_length=1, max_length=100)
    assessment_date: date
    attendance_coverage: AttendanceCoverage
    membership_history_complete: bool
    attendance: tuple[AttendanceEvidence, ...] = Field(max_length=5000)
    membership_periods: tuple[MembershipPeriodEvidence, ...] = Field(max_length=1000)
    membership_pauses: tuple[MembershipPauseEvidence, ...] = Field(default=(), max_length=1000)

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as error:
            raise ValueError("timezone must be a valid IANA timezone") from error
        return value

    @model_validator(mode="after")
    def validate_evidence(self) -> AssessmentInput:
        if len({row.local_date for row in self.attendance}) != len(self.attendance):
            raise ValueError("attendance must contain at most one visit per local date")
        if len({period.id for period in self.membership_periods}) != len(self.membership_periods):
            raise ValueError("membership period IDs must be unique")
        known_ids = {period.id for period in self.membership_periods}
        if any(
            period.renewed_from_id is not None and period.renewed_from_id not in known_ids
            for period in self.membership_periods
        ):
            raise ValueError("renewed_from_id must reference a supplied membership period")
        if len({pause.id for pause in self.membership_pauses}) != len(self.membership_pauses):
            raise ValueError("membership pause IDs must be unique")
        if any(pause.period_id not in known_ids for pause in self.membership_pauses):
            raise ValueError("membership pause period_id must reference a supplied membership period")
        zone = ZoneInfo(self.timezone)
        for row in self.attendance:
            if row.occurred_at.astimezone(zone).date() != row.local_date:
                raise ValueError("attendance local_date must match occurred_at in studio timezone")
        if self.attendance_coverage.end_date and self.attendance_coverage.end_date > self.assessment_date:
            raise ValueError("attendance coverage cannot extend beyond assessment_date")
        for row in self.attendance:
            if row.local_date > self.assessment_date:
                raise ValueError("attendance cannot occur after assessment_date")
        return self


class RiskCategory(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class AssessmentStatus(StrEnum):
    COMPLETE = "COMPLETE"
    LIMITED = "LIMITED"
    EXCLUDED = "EXCLUDED"


class LifecycleState(StrEnum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    EXPIRED = "EXPIRED"
    LAPSED = "LAPSED"
    CHURNED = "CHURNED"
    REACTIVATED = "REACTIVATED"
    UNKNOWN = "UNKNOWN"


class LifecycleEventType(StrEnum):
    CHURN = "CHURN"
    REACTIVATION = "REACTIVATION"


class LifecycleEvent(StrictModel):
    event_type: LifecycleEventType
    event_date: date
    membership_period_id: str


@dataclass(frozen=True)
class Indicator:
    code: str
    label: str
    value: str | int | float | None
    explanation: str
    available: bool = True


class DimensionScore(StrictModel):
    score: Annotated[int, Field(ge=0, le=100)] | None
    configured_weight: int
    applied_weight: float
    available: bool
    explanation: str
    indicators: tuple[Indicator, ...]


class Recommendation(StrictModel):
    action: str
    priority: str
    title: str
    explanation: str
    trigger: str
    evidence: tuple[Indicator, ...] = ()


class AssessmentOutput(StrictModel):
    studio_id: str
    member_id: str
    assessment_date: date
    assessed_at: datetime
    scoring_version: str
    status: AssessmentStatus
    is_complete: bool
    lifecycle_state: LifecycleState
    lifecycle_events: tuple[LifecycleEvent, ...]
    score: Annotated[int, Field(ge=0, le=100)] | None
    category: RiskCategory | None
    dimensions: dict[str, DimensionScore]
    indicators: tuple[Indicator, ...]
    recommendation: Recommendation
    completeness_reasons: tuple[str, ...]

