from datetime import date, datetime, timezone

import pytest

from pranax_intelligence.contracts import AssessmentInput


@pytest.fixture
def assessment_input() -> AssessmentInput:
    return AssessmentInput.model_validate(
        {
            "studio_id": "studio-1",
            "member_id": "member-1",
            "timezone": "Asia/Kolkata",
            "assessment_date": date(2026, 1, 31),
            "attendance_coverage": {
                "start_date": date(2025, 12, 3),
                "end_date": date(2026, 1, 31),
                "verified_at": datetime(2026, 1, 31, 12, tzinfo=timezone.utc),
                "complete": True,
                "gaps": [],
            },
            "membership_history_complete": True,
            "attendance": [
                {"occurred_at": "2025-12-10T10:00:00+05:30", "recorded_at": "2025-12-10T12:00:00+05:30", "local_date": "2025-12-10"},
                {"occurred_at": "2025-12-20T10:00:00+05:30", "recorded_at": "2025-12-20T12:00:00+05:30", "local_date": "2025-12-20"},
                {"occurred_at": "2025-12-30T10:00:00+05:30", "recorded_at": "2025-12-30T12:00:00+05:30", "local_date": "2025-12-30"},
                {"occurred_at": "2026-01-10T10:00:00+05:30", "recorded_at": "2026-01-10T12:00:00+05:30", "local_date": "2026-01-10"},
                {"occurred_at": "2026-01-20T10:00:00+05:30", "recorded_at": "2026-01-20T12:00:00+05:30", "local_date": "2026-01-20"},
                {"occurred_at": "2026-01-30T10:00:00+05:30", "recorded_at": "2026-01-30T12:00:00+05:30", "local_date": "2026-01-30"},
            ],
            "membership_periods": [
                {
                    "id": "period-current",
                    "starts_at": "2025-10-01",
                    "original_ends_at": "2026-02-28",
                    "effective_ends_at": "2026-02-28",
                    "status": "ACTIVE",
                    "recorded_at": "2025-10-01T00:00:00Z",
                    "renewed_from_id": None,
                }
            ],
        }
    )
