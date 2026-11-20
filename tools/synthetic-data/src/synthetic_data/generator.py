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

FIRST_NAMES = [
    "Aarav", "Priyanshu", "Ananya", "Rahul", "Debarati", "Sourav", "Sneha", "Vikram",
    "Pooja", "Arka", "Rohan", "Ishaan", "Tanvi", "Siddharth", "Meera", "Kabir",
    "Neha", "Aditya", "Riya", "Karan", "Shreya", "Naveen", "Ritika", "Arjun",
    "Deepika", "Amit", "Swati", "Rajesh", "Kavita", "Sanjay", "Anushka", "Manish",
    "Sunita", "Varun", "Preeti", "Gaurav", "Nandini", "Abhishek", "Papiya", "Sandip",
    "Moumita", "Subham", "Payel", "Joydeep", "Sarmistha", "Indranil", "Aindrila", "Subhashis",
    "Sayani", "Koushik", "Elena", "Marcus", "Chloe", "David", "Sophie", "Lucas", "Maya", "Alexander",
    "Tanya", "Vivek", "Alok", "Dev", "Ira", "Prisha", "Rupali", "Rituparna", "Soumen", "Trisha"
]

LAST_NAMES = [
    "Chatterjee", "Banerjee", "Mukherjee", "Bhattacharya", "Sengupta", "Dasgupta",
    "Chakraborty", "Ghosh", "Bose", "Dutta", "Mitra", "Roy", "Sen", "Guha",
    "Majumdar", "Talukdar", "Sarkar", "Chowdhury", "Das", "Pal", "Basu", "Sharma",
    "Verma", "Gupta", "Malhotra", "Kapoor", "Mehta", "Patel", "Reddy", "Nair",
    "Iyer", "Rao", "Joshi", "Agarwal", "Mishra", "Smith", "Johnson", "Williams", "Taylor", "Brown"
]


def _id(kind: str, value: str) -> str:
    return str(uuid.uuid5(NAMESPACE, f"{kind}:{value}"))


def _day(value: date) -> str:
    return value.isoformat()


def _zoned_timestamp(local_date: date, timezone: str, hour: int = 18, minute: int = 0) -> str:
    return datetime.combine(local_date, time(hour, minute), ZoneInfo(timezone)).isoformat()


def generate_studio(config: GeneratorConfig) -> tuple[list[dict[str, Any]], list[dict[str, Any]], str]:
    studio_id = config.studio_id if config.studio_id else _id("studio", "synthetic-001")
    evaluation = date.fromisoformat(config.evaluation_date)
    beginning = evaluation - timedelta(days=config.months * 30)
    studio = [{
        "id": studio_id,
        "name": config.studio_name,
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
        {"id": _id("plan", "monthly"), "studioId": studio_id, "name": "Monthly Unlimited", "durationDays": 30, "priceCents": 14900},
        {"id": _id("plan", "quarterly"), "studioId": studio_id, "name": "Quarterly Flow", "durationDays": 90, "priceCents": 39900},
        {"id": _id("plan", "annual"), "studioId": studio_id, "name": "Annual Unlimited", "durationDays": 365, "priceCents": 149900},
    ]


def generate_members(config: GeneratorConfig, studio_id: str) -> list[dict[str, Any]]:
    rng = random.Random(config.seed)
    evaluation = date.fromisoformat(config.evaluation_date)
    beginning = evaluation - timedelta(days=config.months * 30)
    result = []
    total_days = (evaluation - beginning).days

    n = config.member_count
    idx_reg = int(n * 0.43)
    idx_med = int(n * 0.557)
    idx_high = int(n * 0.671)
    idx_paused = int(n * 0.728)
    idx_expired = int(n * 0.842)
    idx_churned = int(n * 0.971)

    for index in range(config.member_count):
        first = FIRST_NAMES[index % len(FIRST_NAMES)]
        last = LAST_NAMES[(index * 7 + 3) % len(LAST_NAMES)]

        if index < 10:
            joined = beginning + timedelta(days=rng.randrange(0, 130))
        elif index < idx_reg:
            days_ago = rng.randint(90, min(total_days, 400))
            joined = evaluation - timedelta(days=days_ago)
        elif index < idx_med:
            days_ago = rng.randint(60, min(total_days, 300))
            joined = evaluation - timedelta(days=days_ago)
        elif index < idx_high:
            days_ago = rng.randint(60, min(total_days, 360))
            joined = evaluation - timedelta(days=days_ago)
        elif index < idx_paused:
            days_ago = rng.randint(90, min(total_days, 300))
            joined = evaluation - timedelta(days=days_ago)
        elif index < idx_expired:
            days_ago = rng.randint(120, min(total_days, 360))
            joined = evaluation - timedelta(days=days_ago)
        elif index < idx_churned:
            days_ago = rng.randint(200, min(total_days, 420))
            joined = evaluation - timedelta(days=days_ago)
        else:
            days_ago = rng.randint(5, 25)
            joined = evaluation - timedelta(days=days_ago)

        email_user = f"{first.lower()}.{last.lower()}.{index + 1:03d}"
        phone_number = f"+91 98301 {(10000 + (index * 73) % 90000):05d}"

        result.append({
            "id": _id("member", str(index)),
            "studioId": studio_id,
            "firstName": first,
            "lastName": last,
            "email": f"{email_user}@example.invalid",
            "phone": phone_number,
            "joinedAt": datetime.combine(joined, time(10, 0), ZoneInfo(config.timezone)).isoformat(),
        })
    return result


def generate_memberships(
    config: GeneratorConfig,
    studio_id: str,
    members: list[dict[str, Any]],
    plans: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    rng = random.Random(config.seed + 1)
    evaluation = date.fromisoformat(config.evaluation_date)
    periods: list[dict[str, Any]] = []
    pauses: list[dict[str, Any]] = []
    lifecycle_events: list[dict[str, Any]] = []
    plan_map = {p["name"]: p for p in plans}
    monthly = plan_map["Monthly Unlimited"]
    quarterly = plan_map["Quarterly Flow"]
    annual = plan_map["Annual Unlimited"]

    def add_period_record(
        p_id: str,
        m_id: str,
        plan_id: str,
        start: date,
        orig_end: date,
        eff_end: date,
        status: str,
        renewed_from: str | None = None,
        canc_at: str | None = None,
    ) -> None:
        row = {
            "id": p_id,
            "studioId": studio_id,
            "memberId": m_id,
            "planId": plan_id,
            "startsAt": _day(start),
            "originalEndsAt": _day(orig_end),
            "effectiveEndsAt": _day(eff_end),
            "status": status,
        }
        if renewed_from is not None:
            row["renewedFromId"] = renewed_from
        if canc_at is not None:
            row["cancelledAt"] = canc_at
        periods.append(row)

    n = config.member_count
    idx_reg = int(n * 0.43)
    idx_med = int(n * 0.557)
    idx_high = int(n * 0.671)
    idx_paused = int(n * 0.728)
    idx_expired = int(n * 0.842)
    idx_churned = int(n * 0.971)

    for index, member in enumerate(members):
        joined = date.fromisoformat(member["joinedAt"][:10])
        member_id = member["id"]

        # 0 to 9: Scenario members
        if index < 10:
            plan = monthly
            duration = plan["durationDays"]
            first_end = min(joined + timedelta(days=duration - 1), evaluation)
            period_id = _id("period", f"{index}:1")
            add_period_record(
                period_id, member_id, plan["id"], joined, first_end, first_end,
                "ACTIVE" if first_end >= evaluation else "EXPIRED"
            )
            continue

        # Engaged regulars (LOW risk) -> Active with healthy expiry (>30 days)
        if index < idx_reg:
            plan = annual if index % 4 == 0 else quarterly if index % 2 == 0 else monthly
            cur_start = joined
            prev_id = None
            period_idx = 1
            while cur_start < evaluation:
                duration = plan["durationDays"]
                cur_end = cur_start + timedelta(days=duration - 1)
                period_id = _id("period", f"{index}:{period_idx}")
                if cur_end < evaluation:
                    add_period_record(
                        period_id, member_id, plan["id"], cur_start, cur_end, cur_end,
                        "EXPIRED", renewed_from=prev_id
                    )
                    prev_id = period_id
                    period_idx += 1
                    cur_start = cur_end + timedelta(days=1)
                else:
                    active_end = max(cur_end, evaluation + timedelta(days=35 + (index % 15) * 10))
                    add_period_record(
                        period_id, member_id, plan["id"], cur_start, active_end, active_end,
                        "ACTIVE", renewed_from=prev_id
                    )
                    break
            continue

        # Gradually disengaging / Medium risk
        if index < idx_med:
            plan = monthly if index % 2 == 0 else quarterly
            cur_start = joined
            prev_id = None
            period_idx = 1
            while cur_start < evaluation:
                duration = plan["durationDays"]
                cur_end = cur_start + timedelta(days=duration - 1)
                period_id = _id("period", f"{index}:{period_idx}")
                if cur_end < evaluation - timedelta(days=30):
                    add_period_record(
                        period_id, member_id, plan["id"], cur_start, cur_end, cur_end,
                        "EXPIRED", renewed_from=prev_id
                    )
                    prev_id = period_id
                    period_idx += 1
                    cur_start = cur_end + timedelta(days=1)
                else:
                    med_midpoint = idx_reg + (idx_med - idx_reg) // 2
                    if index < med_midpoint:
                        days_left = 9 + (index - idx_reg) % 5
                    else:
                        days_left = 16 + (index - med_midpoint) % 9
                    active_end = evaluation + timedelta(days=days_left)
                    add_period_record(
                        period_id, member_id, plan["id"], cur_start, active_end, active_end,
                        "ACTIVE", renewed_from=prev_id
                    )
                    break
            continue

        # High churn risk (ACTIVE)
        if index < idx_high:
            plan = monthly
            cur_start = joined
            prev_id = None
            period_idx = 1
            while cur_start < evaluation:
                duration = plan["durationDays"]
                cur_end = cur_start + timedelta(days=duration - 1)
                period_id = _id("period", f"{index}:{period_idx}")
                if cur_end < evaluation - timedelta(days=30):
                    add_period_record(
                        period_id, member_id, plan["id"], cur_start, cur_end, cur_end,
                        "EXPIRED", renewed_from=prev_id
                    )
                    prev_id = period_id
                    period_idx += 1
                    cur_start = cur_end + timedelta(days=1)
                else:
                    high_midpoint = idx_med + (idx_high - idx_med) // 2
                    if index < high_midpoint:
                        days_left = 1 + (index - idx_med) % 6
                    else:
                        days_left = 20 + (index - high_midpoint) % 15
                    active_end = evaluation + timedelta(days=days_left)
                    add_period_record(
                        period_id, member_id, plan["id"], cur_start, active_end, active_end,
                        "ACTIVE"
                    )
                    break
            continue

        # Currently PAUSED
        if index < idx_paused:
            plan = quarterly
            period_id = _id("period", f"{index}:1")
            period_start = joined
            pause_start = evaluation - timedelta(days=7 + (index % 7))
            pause_resume = evaluation + timedelta(days=14 + (index % 14))
            period_end = pause_resume + timedelta(days=30)
            add_period_record(
                period_id, member_id, plan["id"], period_start, period_end, period_end,
                "PAUSED"
            )
            pauses.append({
                "id": _id("pause", f"{index}:1"),
                "studioId": studio_id,
                "periodId": period_id,
                "startsAt": _day(pause_start),
                "resumesAt": _day(pause_resume),
            })
            continue

        # Recently EXPIRED / LAPSED
        if index < idx_expired:
            plan = monthly if index % 2 == 0 else quarterly
            period_id = _id("period", f"{index}:1")
            expired_ago = 5 + (index - idx_paused) % 55
            period_end = evaluation - timedelta(days=expired_ago)
            period_start = period_end - timedelta(days=plan["durationDays"] - 1)
            add_period_record(
                period_id, member_id, plan["id"], period_start, period_end, period_end,
                "EXPIRED"
            )
            continue

        # Historically CHURNED / CANCELLED
        if index < idx_churned:
            plan = monthly
            period_id = _id("period", f"{index}:1")
            if index % 2 == 0:
                cancel_days_ago = 90 + (index - idx_expired) * 3
                cancel_date = evaluation - timedelta(days=cancel_days_ago)
                period_start = cancel_date - timedelta(days=15)
                period_end = cancel_date
                add_period_record(
                    period_id, member_id, plan["id"], period_start, cancel_date + timedelta(days=15), period_end,
                    "CANCELLED", canc_at=_zoned_timestamp(cancel_date, config.timezone)
                )
                lifecycle_events.append({
                    "id": _id("cancellation", str(index)),
                    "studioId": studio_id,
                    "memberId": member_id,
                    "membershipPeriodId": period_id,
                    "effectiveOn": _day(period_end),
                    "kind": "CANCELLED",
                })
            else:
                expired_ago = 120 + (index - idx_expired) * 3
                period_end = evaluation - timedelta(days=expired_ago)
                period_start = period_end - timedelta(days=30)
                add_period_record(
                    period_id, member_id, plan["id"], period_start, period_end, period_end,
                    "EXPIRED"
                )
            continue

        # Recently joined / Onboarding
        plan = monthly
        period_id = _id("period", f"{index}:1")
        period_start = joined
        period_end = period_start + timedelta(days=29)
        add_period_record(
            period_id, member_id, plan["id"], period_start, period_end, period_end,
            "ACTIVE"
        )

    return periods, pauses, lifecycle_events


def generate_attendance(
    config: GeneratorConfig,
    studio_id: str,
    members: list[dict[str, Any]],
    periods: list[dict[str, Any]],
    pauses: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    rng = random.Random(config.seed + 2)
    evaluation = date.fromisoformat(config.evaluation_date)
    result: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()

    periods_by_member: dict[str, list[dict]] = {}
    for p in periods:
        periods_by_member.setdefault(p["memberId"], []).append(p)

    pauses_by_member: dict[str, list[dict]] = {}
    for p in pauses:
        period_member = next(per["memberId"] for per in periods if per["id"] == p["periodId"])
        pauses_by_member.setdefault(period_member, []).append(p)

    def is_paused(member_id: str, d: date) -> bool:
        for pause in pauses_by_member.get(member_id, []):
            p_start = date.fromisoformat(pause["startsAt"])
            p_resume = date.fromisoformat(pause["resumesAt"]) if pause["resumesAt"] else date.max
            if p_start <= d < p_resume:
                return True
        return False

    def add_visit(member_id: str, visit_date: date, hour: int = 18, minute: int = 0) -> None:
        if visit_date > evaluation:
            return
        key = (member_id, visit_date.isoformat())
        if key in seen:
            return
        seen.add(key)
        result.append({
            "id": _id("attendance", f"{member_id}:{visit_date.isoformat()}"),
            "studioId": studio_id,
            "memberId": member_id,
            "batchId": _id("attendance-batch", "year-001"),
            "occurredAt": _zoned_timestamp(visit_date, config.timezone, hour, minute),
            "localDate": visit_date.isoformat(),
            "source": "CSV",
        })

    n = config.member_count
    idx_reg = int(n * 0.43)
    idx_med = int(n * 0.557)
    idx_high = int(n * 0.671)
    idx_paused = int(n * 0.728)
    idx_expired = int(n * 0.842)
    idx_churned = int(n * 0.971)

    for index, member in enumerate(members):
        member_id = member["id"]
        member_periods = periods_by_member.get(member_id, [])
        if not member_periods:
            continue

        joined = date.fromisoformat(member["joinedAt"][:10])

        if index < 10:
            visits = (18, 8, 5, 3, 10, 2, 1, 7, 12, 4)[index]
            span_days = max(1, (evaluation - joined).days)
            for v in range(visits):
                offset = int((v + 1) * span_days / (visits + 1))
                d = joined + timedelta(days=offset)
                if not is_paused(member_id, d):
                    add_visit(member_id, d, 18, (v * 15) % 45)
            continue

        # Engaged regulars (LOW risk)
        if index < idx_reg:
            cur = joined + timedelta(days=rng.randint(1, 3))
            while cur <= evaluation:
                if not is_paused(member_id, cur):
                    h = 7 + (rng.randint(0, 11))
                    m = rng.choice([0, 15, 30, 45])
                    add_visit(member_id, cur, h, m)
                cur += timedelta(days=rng.choice([2, 2, 3, 3, 4]))
            recent_visit = evaluation - timedelta(days=rng.choice([1, 2, 3]))
            add_visit(member_id, recent_visit, 18, 0)
            continue

        # Gradually disengaging (Medium risk)
        if index < idx_med:
            cur = joined + timedelta(days=2)
            stop_historical = evaluation - timedelta(days=30)
            while cur < stop_historical:
                if not is_paused(member_id, cur):
                    add_visit(member_id, cur, 18, 0)
                cur += timedelta(days=rng.choice([4, 5, 6]))
            v_prev1 = evaluation - timedelta(days=25)
            v_prev2 = evaluation - timedelta(days=18)
            v_last = evaluation - timedelta(days=6 + (index % 5))
            add_visit(member_id, v_prev1, 18, 0)
            add_visit(member_id, v_prev2, 18, 0)
            add_visit(member_id, v_last, 18, 0)
            continue

        # High churn risk
        if index < idx_high:
            cur = joined + timedelta(days=rng.randint(1, 3))
            stop_historical = evaluation - timedelta(days=40)
            while cur < stop_historical:
                if not is_paused(member_id, cur):
                    add_visit(member_id, cur, 18, 0)
                cur += timedelta(days=rng.choice([3, 4]))

            high_midpoint = idx_med + (idx_high - idx_med) // 2
            if index < high_midpoint:
                v1 = evaluation - timedelta(days=16 + (index - idx_med) % 6)
                add_visit(member_id, v1, 18, 0)
            else:
                v1 = evaluation - timedelta(days=36 + (index - high_midpoint) % 8)
                add_visit(member_id, v1, 18, 0)
            continue

        # Currently paused
        if index < idx_paused:
            cur = joined + timedelta(days=rng.randint(1, 3))
            pause = pauses_by_member.get(member_id, [None])[0]
            pause_start = date.fromisoformat(pause["startsAt"]) if pause else evaluation
            while cur < pause_start - timedelta(days=2):
                add_visit(member_id, cur, 18, 0)
                cur += timedelta(days=rng.choice([3, 4]))
            continue

        # Recently expired
        if index < idx_expired:
            p = member_periods[0]
            p_end = date.fromisoformat(p["effectiveEndsAt"])
            cur = joined + timedelta(days=rng.randint(1, 3))
            while cur < p_end - timedelta(days=3):
                add_visit(member_id, cur, 18, 0)
                cur += timedelta(days=rng.choice([3, 4]))
            continue

        # Historically churned
        if index < idx_churned:
            p = member_periods[0]
            p_end = date.fromisoformat(p["effectiveEndsAt"])
            cur = joined + timedelta(days=rng.randint(1, 3))
            while cur < p_end - timedelta(days=5):
                add_visit(member_id, cur, 18, 0)
                cur += timedelta(days=rng.choice([4, 5]))
            continue

        # Onboarding
        cur = joined + timedelta(days=2)
        while cur <= evaluation:
            add_visit(member_id, cur, 18, 0)
            cur += timedelta(days=rng.choice([2, 3]))

    scenario_members = [m["id"] for m in members[:10]]
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

    attendance[:] = [row for row in attendance if row["memberId"] != scenario_members[2]]

    base = by_member[scenario_members[4]][0]
    base_end = date.fromisoformat(base["effectiveEndsAt"])
    add_period(4, "nonrenewal-2", base_end + timedelta(days=1), base_end + timedelta(days=30))

    base = by_member[scenario_members[5]][0]
    grace_end = date.fromisoformat(base["effectiveEndsAt"])
    add_period(5, "grace-renewal", grace_end + timedelta(days=12), grace_end + timedelta(days=41),
               renewedFromId=base["id"])

    base = by_member[scenario_members[7]][0]
    base["status"] = "CANCELLED"
    base["effectiveEndsAt"] = base["originalEndsAt"]
    base["cancelledAt"] = base["effectiveEndsAt"] + "T12:00:00Z"
    churn_end = date.fromisoformat(base["effectiveEndsAt"])
    add_period(7, "reactivation", churn_end + timedelta(days=31), churn_end + timedelta(days=60), "ACTIVE")

    base = by_member[scenario_members[8]][0]
    base["status"] = "EXPIRED"
    expiry_end = date.fromisoformat(base["effectiveEndsAt"])
    add_period(8, "confirmed-renewal", expiry_end + timedelta(days=1), expiry_end + timedelta(days=30),
               "ACTIVE", renewedFromId=base["id"])

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
    attendance = generate_attendance(config, studio_id, members, periods, pauses)
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
