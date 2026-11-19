"""Deterministic, timezone-aware synthetic record generation."""
from __future__ import annotations

import random
import uuid
from datetime import date, datetime, timedelta, time
from zoneinfo import ZoneInfo
from typing import Any

from .models import Dataset, GeneratorConfig

SCENARIO_IDS = (
    "attendance-coverage-60-days",
    "last-attendance-45-days-ago",
    "zero-visits-complete-coverage",
    "incomplete-attendance-coverage",
    "two-non-renewal-opportunities",
    "renewal-on-grace-day-12",
    "two-membership-pauses",
    "churn-then-reactivation",
    "approaching-expiry-confirmed-renewal",
    "insufficient-retention-history",
)
NAMESPACE = uuid.UUID("c0f2d5a1-8a77-5c0b-9a7a-3d5f20b1e6d3")


def _id(kind: str, value: str) -> str:
    return str(uuid.uuid5(NAMESPACE, f"{kind}:{value}"))


def _day(value: date) -> str:
    return value.isoformat()


def _zoned_timestamp(local_date: date, timezone: str) -> str:
    return datetime.combine(local_date, time(18, 0), ZoneInfo(timezone)).isoformat()


def generate_studio(config: GeneratorConfig) -> tuple[list[dict[str, Any]], list[dict[str, Any]], str]:
    studio_id = _id("studio", "synthetic-001")
    evaluation = date.fromisoformat(config.evaluation_date)
    beginning = evaluation - timedelta(days=364)
    studio = [{
        "id": studio_id,
        "name": "Fictional Flow Pilates",
        "timezone": config.timezone,
        "isSynthetic": True,
    }]
    settings = [{
        "id": _id("settings", "synthetic-001"),
        "studioId": studio_id,
        "attendanceCoverageFrom": _day(beginning),
        "coverageVerifiedAt": f"{config.evaluation_date}T00:00:00Z",
    }]
    return studio, settings, studio_id


def generate_plans(studio_id: str) -> list[dict[str, Any]]:
    return [
        {"id": _id("plan", "monthly"), "studioId": studio_id, "name": "Monthly", "durationDays": 30, "priceCents": 14900},
        {"id": _id("plan", "quarterly"), "studioId": studio_id, "name": "Quarterly", "durationDays": 90, "priceCents": 39900},
        {"id": _id("plan", "annual"), "studioId": studio_id, "name": "Annual", "durationDays": 365, "priceCents": 149900},
    ]


def generate_members(config: GeneratorConfig, studio_id: str) -> list[dict[str, Any]]:
    rng = random.Random(config.seed)
    evaluation = date.fromisoformat(config.evaluation_date)
    beginning = evaluation - timedelta(days=364)
    result = []
    for index in range(config.member_count):
        joined = beginning + timedelta(days=rng.randrange(0, 130))
        result.append({
            "id": _id("member", str(index)),
            "studioId": studio_id,
            "firstName": f"Member{index + 1:04d}",
            "lastName": "Synthetic",
            "email": f"member{index + 1:04d}@example.invalid",
            "phone": None,
            "joinedAt": datetime.combine(joined, time(12, 0), ZoneInfo(config.timezone)).isoformat(),
        })
    return result


def generate_memberships(
    config: GeneratorConfig,
    studio_id: str,
    members: list[dict[str, Any]],
    plans: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    evaluation = date.fromisoformat(config.evaluation_date)
    beginning = evaluation - timedelta(days=364)
    periods: list[dict[str, Any]] = []
    pauses: list[dict[str, Any]] = []
    lifecycle_events: list[dict[str, Any]] = []

    for index, member in enumerate(members):
        joined = date.fromisoformat(member["joinedAt"][:10])
        plan = plans[index % len(plans)]
        duration = plan["durationDays"]
        first_end = min(joined + timedelta(days=duration - 1), evaluation)
        period_id = _id("period", f"{index}:1")
        if index % 20 == 6:
            status = "PAUSED"
            original_end = first_end
            effective_end = min(original_end + timedelta(days=14), evaluation)
            pause_start = joined + timedelta(days=min(5, max(0, (evaluation - joined).days)))
            pause_resume = pause_start + timedelta(days=7)
            pauses.append({
                "id": _id("pause", f"{index}:1"),
                "studioId": studio_id,
                "periodId": period_id,
                "startsAt": _day(pause_start),
                "resumesAt": _day(pause_resume),
            })
            if pause_resume + timedelta(days=7) < effective_end:
                pauses.append({
                    "id": _id("pause", f"{index}:2"),
                    "studioId": studio_id,
                    "periodId": period_id,
                    "startsAt": _day(pause_resume + timedelta(days=7)),
                    "resumesAt": _day(pause_resume + timedelta(days=12)),
                })
            effective_end = min(effective_end + timedelta(days=12), evaluation)
        elif index % 20 == 12:
            status = "CANCELLED"
            original_end = first_end
            effective_end = min(joined + timedelta(days=max(10, duration // 3)), original_end)
            lifecycle_events.append({
                "id": _id("cancellation", str(index)),
                "studioId": studio_id,
                "memberId": member["id"],
                "membershipPeriodId": period_id,
                "effectiveOn": _day(effective_end),
                "kind": "CANCELLED",
            })
        elif first_end == evaluation or (index % 20 in (0, 7, 15)):
            status = "ACTIVE"
            original_end = first_end
            effective_end = max(first_end, evaluation)
        else:
            status = "EXPIRED"
            original_end = first_end
            effective_end = first_end

        periods.append({
            "id": period_id,
            "studioId": studio_id,
            "memberId": member["id"],
            "planId": plan["id"],
            "startsAt": _day(joined),
            "originalEndsAt": _day(original_end),
            "effectiveEndsAt": _day(effective_end),
            "status": status,
            "cancelledAt": lifecycle_events[-1]["effectiveOn"] + "T12:00:00Z"
                if lifecycle_events and lifecycle_events[-1]["memberId"] == member["id"] else None,
        })

        if status == "EXPIRED" and index % 3 == 0 and first_end < evaluation:
            second_start = first_end + timedelta(days=1)
            second_end = min(second_start + timedelta(days=duration - 1), evaluation)
            second_id = _id("period", f"{index}:2")
            periods.append({
                "id": second_id,
                "studioId": studio_id,
                "memberId": member["id"],
                "planId": plan["id"],
                "startsAt": _day(second_start),
                "originalEndsAt": _day(second_end),
                "effectiveEndsAt": _day(second_end),
                "status": "ACTIVE" if second_end == evaluation else "EXPIRED",
                "renewedFromId": period_id,
            })

    return periods, pauses, lifecycle_events


def generate_attendance(
    config: GeneratorConfig,
    studio_id: str,
    members: list[dict[str, Any]],
    periods: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    rng = random.Random(config.seed)
    evaluation = date.fromisoformat(config.evaluation_date)
    result: list[dict[str, Any]] = []
    archetype_visits = (18, 8, 5, 3, 10, 2, 1, 7)
    by_member = {member["id"]: member for member in members}
    for index, member in enumerate(members):
        joined = date.fromisoformat(member["joinedAt"][:10])
        visits = archetype_visits[index % 8]
        span_start = joined
        span_days = max(1, (evaluation - span_start).days)
        for visit_number in range(visits):
            offset = int((visit_number + 1) * span_days / (visits + 1))
            local_date = span_start + timedelta(days=offset)
            if local_date > evaluation:
                continue
            key = (member["id"], local_date)
            if any(row["memberId"] == key[0] and row["localDate"] == key[1].isoformat() for row in result):
                continue
            result.append({
                "id": _id("attendance", f"{index}:{visit_number}:{key[1].isoformat()}"),
                "studioId": studio_id,
                "memberId": member["id"],
                "batchId": _id("attendance-batch", "year-001"),
                "occurredAt": _zoned_timestamp(local_date, config.timezone),
                "localDate": local_date.isoformat(),
                "source": "CSV",
            })

    # Scenario fixtures are explicitly represented in scenario records below.
    scenario_members = [member["id"] for member in members[:10]]
    result = [row for row in result if row["memberId"] != scenario_members[1]]
    result.append({
        "id": _id("attendance", "last-45"),
        "studioId": studio_id,
        "memberId": scenario_members[1],
        "batchId": _id("attendance-batch", "year-001"),
        "occurredAt": _zoned_timestamp(evaluation - timedelta(days=45), config.timezone),
        "localDate": (evaluation - timedelta(days=45)).isoformat(),
        "source": "MANUAL",
    })
    result = [row for row in result if row["memberId"] != scenario_members[2]]
    return result


def apply_controlled_scenarios(
    config: GeneratorConfig,
    studio_id: str,
    members: list[dict[str, Any]],
    periods: list[dict[str, Any]],
    pauses: list[dict[str, Any]],
    attendance: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    evaluation = date.fromisoformat(config.evaluation_date)
    scenario_members = [member["id"] for member in members[:10]]
    by_member = {row["memberId"]: [] for row in periods}
    for period in periods:
        by_member.setdefault(period["memberId"], []).append(period)

    def add_period(member_index: int, suffix: str, start: date, end: date, status: str = "EXPIRED", **extra: Any) -> dict[str, Any]:
        member_id = scenario_members[member_index]
        existing = by_member.setdefault(member_id, [])
        row = {
            "id": _id("period", f"{member_index}:{suffix}"),
            "studioId": studio_id,
            "memberId": member_id,
            "planId": _id("plan", "monthly"),
            "startsAt": start.isoformat(),
            "originalEndsAt": end.isoformat(),
            "effectiveEndsAt": end.isoformat(),
            "status": status,
            **extra,
        }
        periods.append(row)
        existing.append(row)
        return row

    # Zero visits: remove scenario member attendance.
    attendance[:] = [row for row in attendance if row["memberId"] != scenario_members[2]]

    # Two non-renewal periods.
    base = by_member[scenario_members[4]][0]
    base_end = date.fromisoformat(base["effectiveEndsAt"])
    add_period(4, "nonrenewal-2", base_end + timedelta(days=1), base_end + timedelta(days=30))

    # Renewal exactly 12 grace days after the prior end.
    base = by_member[scenario_members[5]][0]
    grace_end = date.fromisoformat(base["effectiveEndsAt"])
    add_period(5, "grace-renewal", grace_end + timedelta(days=12), grace_end + timedelta(days=41),
               renewedFromId=base["id"])

    # Explicit churn and reactivation with a 31-day gap.
    base = by_member[scenario_members[7]][0]
    base["status"] = "CANCELLED"
    base["effectiveEndsAt"] = base["originalEndsAt"]
    base["cancelledAt"] = base["effectiveEndsAt"] + "T12:00:00Z"
    churn_end = date.fromisoformat(base["effectiveEndsAt"])
    add_period(7, "reactivation", churn_end + timedelta(days=31), churn_end + timedelta(days=60), "ACTIVE")

    # Approaching expiry with confirmed renewal.
    base = by_member[scenario_members[8]][0]
    base["status"] = "EXPIRED"
    expiry_end = date.fromisoformat(base["effectiveEndsAt"])
    add_period(8, "confirmed-renewal", expiry_end + timedelta(days=1), expiry_end + timedelta(days=30),
               "ACTIVE", renewedFromId=base["id"])

    # Exactly two pauses on the reserved two-pause member.
    pause_period = by_member[scenario_members[6]][0]
    existing_pauses = [pause for pause in pauses if pause["periodId"] == pause_period["id"]]
    if len(existing_pauses) < 2:
        pause_start = date.fromisoformat(pause_period["startsAt"])
        for offset in (5, 15):
            pauses.append({
                "id": _id("pause", f"scenario:{offset}"),
                "studioId": studio_id,
                "periodId": pause_period["id"],
                "startsAt": _day(pause_start + timedelta(days=offset)),
                "resumesAt": _day(pause_start + timedelta(days=offset + 2)),
            })

    scenarios = [
        {"id": "attendance-coverage-60-days", "memberId": scenario_members[0],
         "evaluationDate": evaluation.isoformat(), "coverage": {"startDate": (evaluation - timedelta(days=59)).isoformat(),
         "endDate": evaluation.isoformat(), "complete": True, "visitCount": None}},
        {"id": "last-attendance-45-days-ago", "memberId": scenario_members[1],
         "evaluationDate": evaluation.isoformat(), "coverage": {"complete": True, "lastAttendanceDaysAgo": 45}},
        {"id": "zero-visits-complete-coverage", "memberId": scenario_members[2],
         "evaluationDate": evaluation.isoformat(), "coverage": {"complete": True, "visitCount": 0}},
        {"id": "incomplete-attendance-coverage", "memberId": scenario_members[3],
         "evaluationDate": evaluation.isoformat(), "coverage": {"complete": False, "startDate": None, "endDate": None}},
        {"id": "two-non-renewal-opportunities", "memberId": scenario_members[4],
         "evaluationDate": evaluation.isoformat(), "renewal": {"completedOpportunities": 2, "renewed": False}},
        {"id": "renewal-on-grace-day-12", "memberId": scenario_members[5],
         "evaluationDate": evaluation.isoformat(), "renewal": {"graceDay": 12}},
        {"id": "two-membership-pauses", "memberId": scenario_members[6],
         "evaluationDate": evaluation.isoformat(), "pause": {"count": 2}},
        {"id": "churn-then-reactivation", "memberId": scenario_members[7],
         "evaluationDate": evaluation.isoformat(), "lifecycle": {"churned": True, "reactivationGapDays": 31}},
        {"id": "approaching-expiry-confirmed-renewal", "memberId": scenario_members[8],
         "evaluationDate": evaluation.isoformat(), "renewal": {"confirmed": True}},
        {"id": "insufficient-retention-history", "memberId": scenario_members[9],
         "evaluationDate": evaluation.isoformat(), "coverage": {"complete": False, "fullAssessmentAvailable": False}},
    ]
    return periods, pauses, attendance, scenarios


def generate_dataset(config: GeneratorConfig | None = None) -> Dataset:
    config = config or GeneratorConfig()
    studios, settings, studio_id = generate_studio(config)
    plans = generate_plans(studio_id)
    members = generate_members(config, studio_id)
    periods, pauses, lifecycle_events = generate_memberships(config, studio_id, members, plans)
    attendance = generate_attendance(config, studio_id, members, periods)
    periods, pauses, attendance, scenarios = apply_controlled_scenarios(
        config, studio_id, members, periods, pauses, attendance
    )
    batches = [{
        "id": _id("attendance-batch", "year-001"),
        "studioId": studio_id,
        "sourceName": "synthetic-history.csv",
        "idempotencyKey": f"synthetic-{config.dataset_version}",
        "rowCount": len(attendance),
    }]
    manifest = {
        "datasetVersion": config.dataset_version,
        "generatorVersion": config.generator_version,
        "schemaVersion": "prisma-foundation-v2",
        "syntheticStudioId": studio_id,
        "seed": config.seed,
        "config": config.as_dict(),
        "scenarioIds": list(SCENARIO_IDS),
        "generatedAt": f"{config.evaluation_date}T00:00:00Z",
        "syntheticIntelligence": {
            "retentionSnapshotsIncluded": False,
            "churnPredictionsIncluded": False,
            "limitation": "No synthetic intelligence outputs are operational results.",
        },
        "entityCounts": {},
    }
    dataset = Dataset(
        manifest,
        studios,
        settings,
        members,
        plans,
        periods,
        pauses,
        batches,
        attendance,
        [],
        [],
        scenarios,
    )
    dataset.manifest["entityCounts"] = {
        key: len(value) if isinstance(value, list) else 1
        for key, value in dataset.records().items()
        if key != "manifest"
    }
    return dataset
