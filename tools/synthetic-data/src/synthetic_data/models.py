from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class GeneratorConfig:
    seed: int = 20251120
    member_count: int = 350
    months: int = 12
    generator_version: str = "1.2.0"
    dataset_version: str = "1.2.0"
    evaluation_date: str = "2025-12-31"
    timezone: str = "America/New_York"

    def __post_init__(self) -> None:
        if not 300 <= self.member_count <= 500:
            raise ValueError("member_count must be between 300 and 500")
        if self.months != 12:
            raise ValueError("the frozen baseline requires exactly 12 months")

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Dataset:
    manifest: dict[str, Any]
    studios: list[dict[str, Any]]
    studioSettings: list[dict[str, Any]]
    members: list[dict[str, Any]]
    membershipPlans: list[dict[str, Any]]
    membershipPeriods: list[dict[str, Any]]
    membershipPauses: list[dict[str, Any]]
    attendanceImportBatches: list[dict[str, Any]]
    attendanceRecords: list[dict[str, Any]]
    retentionSnapshots: list[dict[str, Any]]
    churnPredictions: list[dict[str, Any]]
    scenarios: list[dict[str, Any]]

    def records(self) -> dict[str, Any]:
        return {key: getattr(self, key) for key in (
            "manifest", "studios", "studioSettings", "members", "membershipPlans",
            "membershipPeriods", "membershipPauses", "attendanceImportBatches",
            "attendanceRecords", "retentionSnapshots", "churnPredictions", "scenarios",
        )}
