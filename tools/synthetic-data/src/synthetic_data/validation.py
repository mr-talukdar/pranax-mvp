from __future__ import annotations

from datetime import date, datetime
from .generator import SCENARIO_IDS
from .models import Dataset


class ValidationError(ValueError):
    pass


def _date(value: str) -> date:
    return date.fromisoformat(value[:10])


def validate_dataset(dataset: Dataset) -> None:
    errors: list[str] = []
    studio_id = dataset.manifest.get("syntheticStudioId")
    if dataset.manifest.get("schemaVersion") != "prisma-foundation-v2":
        errors.append("unsupported schemaVersion")
    if len(dataset.studios) != 1 or dataset.studios[0].get("id") != studio_id or not dataset.studios[0].get("isSynthetic"):
        errors.append("dataset must contain one synthetic studio matching manifest")
    member_ids = {row["id"] for row in dataset.members}
    plan_ids = {row["id"] for row in dataset.membershipPlans}
    periods = {row["id"]: row for row in dataset.membershipPeriods}
    if len(member_ids) != len(dataset.members):
        errors.append("member ids are not unique")
    if len({row.get("email") for row in dataset.members}) != len(dataset.members):
        errors.append("member emails are not unique")
    for row in dataset.members:
        if row.get("studioId") != studio_id:
            errors.append(f"invalid tenant in members: {row.get('id')}")
    by_member: dict[str, list[dict]] = {}
    for row in dataset.membershipPeriods:
        if row["studioId"] != studio_id or row["memberId"] not in member_ids or row["planId"] not in plan_ids:
            errors.append(f"invalid membership reference: {row['id']}")
        if _date(row["startsAt"]) > _date(row["effectiveEndsAt"]):
            errors.append(f"invalid membership chronology: {row['id']}")
        if row["status"] == "CANCELLED" and _date(row["effectiveEndsAt"]) > _date(row["originalEndsAt"]):
            errors.append(f"cancelled period has effective end after original end: {row['id']}")
        by_member.setdefault(row["memberId"], []).append(row)
    for member_id, rows in by_member.items():
        ordered = sorted(rows, key=lambda row: row["startsAt"])
        for before, after in zip(ordered, ordered[1:]):
            if _date(after["startsAt"]) <= _date(before["effectiveEndsAt"]):
                errors.append(f"overlapping memberships for {member_id}")
        current = [row for row in rows if row["status"] in ("ACTIVE", "PAUSED")]
        if len(current) > 1:
            errors.append(f"multiple active or paused memberships for {member_id}")
    for row in dataset.membershipPauses:
        period = periods.get(row["periodId"])
        if row["studioId"] != studio_id or not period or period["studioId"] != studio_id:
            errors.append(f"invalid pause reference: {row['id']}")
        elif not (_date(period["startsAt"]) <= _date(row["startsAt"]) <= _date(row["resumesAt"] or period["effectiveEndsAt"]) <= _date(period["effectiveEndsAt"])):
            errors.append(f"pause outside membership period: {row['id']}")
    seen: set[tuple[str, str]] = set()
    for row in dataset.attendanceRecords:
        key = (row["memberId"], row["localDate"])
        if key in seen:
            errors.append(f"duplicate attendance: {key}")
        seen.add(key)
        if row["studioId"] != studio_id or row["memberId"] not in member_ids:
            errors.append(f"invalid attendance reference: {row['id']}")
        try:
            datetime.fromisoformat(row["occurredAt"])
            _date(row["localDate"])
        except ValueError:
            errors.append(f"invalid attendance timestamp: {row['id']}")
    batch_ids = {row["id"] for row in dataset.attendanceImportBatches}
    for row in dataset.attendanceRecords:
        if row.get("batchId") not in batch_ids:
            errors.append(f"attendance batch missing: {row['id']}")
    for collection in ("studioSettings", "membershipPlans", "attendanceImportBatches",
                       "retentionSnapshots", "churnPredictions"):
        for row in getattr(dataset, collection):
            if row["studioId"] != studio_id:
                errors.append(f"invalid tenant in {collection}: {row['id']}")
            if collection in ("retentionSnapshots", "churnPredictions") and row.get("memberId") not in member_ids:
                errors.append(f"invalid member reference in {collection}: {row['id']}")
    scenario_ids = [row["id"] for row in dataset.scenarios]
    if set(scenario_ids) != set(SCENARIO_IDS):
        errors.append("scenario catalogue is incomplete")
    if len(scenario_ids) != len(set(scenario_ids)):
        errors.append("scenario ids are not unique")
    scenarios = {row["id"]: row for row in dataset.scenarios}
    evaluation = _date(dataset.manifest["config"]["evaluation_date"])
    attendance_by_member: dict[str, list[dict]] = {}
    for row in dataset.attendanceRecords:
        attendance_by_member.setdefault(row["memberId"], []).append(row)
    for scenario_id in SCENARIO_IDS:
        scenario = scenarios.get(scenario_id)
        if not scenario:
            continue
        member_id = scenario["memberId"]
        expected = scenario.get("expected", {})
        member_periods = sorted(by_member.get(member_id, []), key=lambda row: row["startsAt"])
        if scenario_id == "attendance-coverage-60-days":
            coverage = scenario.get("coverage", {})
            if coverage.get("complete") is not True or (_date(coverage["endDate"]) - _date(coverage["startDate"])).days != 59:
                errors.append("attendance coverage scenario must declare 60 days")
        elif scenario_id == "attendance-coverage-60-days" and expected.get("coverageDays") != 60:
            errors.append("attendance coverage scenario must declare 60 days")
        if scenario_id == "last-attendance-45-days-ago":
            dates = [ _date(row["localDate"]) for row in attendance_by_member.get(member_id, []) ]
            if not dates or (evaluation - max(dates)).days != 45:
                errors.append("last-attendance scenario is not exactly 45 days old")
        if scenario_id == "zero-visits-complete-coverage":
            if attendance_by_member.get(member_id) or scenario.get("coverage", {}).get("complete") is not True or scenario.get("coverage", {}).get("visitCount") != 0:
                errors.append("zero-visits scenario is not complete and empty")
        if scenario_id == "incomplete-attendance-coverage" and scenario.get("coverage", {}).get("complete") is not False:
            errors.append("incomplete coverage scenario is not declared incomplete")
        if scenario_id == "two-non-renewal-opportunities":
            if len(member_periods) < 2 or any("renewedFromId" in row for row in member_periods):
                errors.append("non-renewal scenario lacks two unrenewed periods")
        if scenario_id == "renewal-on-grace-day-12":
            if not any(row.get("renewedFromId") and
                       ( _date(row["startsAt"]) - _date(next(p["effectiveEndsAt"] for p in member_periods if p["id"] == row["renewedFromId"]))).days == 12
                       for row in member_periods):
                errors.append("grace-day renewal scenario is not day 12")
        if scenario_id == "two-membership-pauses" and len([row for row in dataset.membershipPauses if periods.get(row["periodId"], {}).get("memberId") == member_id]) != 2:
            errors.append("two-pause scenario does not contain two pauses")
        if scenario_id == "churn-then-reactivation":
            if not any(( _date(after["startsAt"]) - _date(before["effectiveEndsAt"])).days == 31
                       for before, after in zip(member_periods, member_periods[1:])):
                errors.append("reactivation scenario lacks a 31-day churn gap")
        if scenario_id == "approaching-expiry-confirmed-renewal" and not any(row.get("renewedFromId") for row in member_periods):
            errors.append("confirmed renewal scenario lacks a renewal")
        if scenario_id == "insufficient-retention-history":
            if scenario.get("coverage", {}).get("fullAssessmentAvailable") is not False:
                errors.append("insufficient-history scenario lacks incomplete history declaration")
    if errors:
        raise ValidationError("; ".join(errors))
