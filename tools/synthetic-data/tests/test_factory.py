import json
import sys
from pathlib import Path
from datetime import date
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).parents[1] / "src"))
from synthetic_data import GeneratorConfig, generate_dataset, validate_dataset
from synthetic_data.exporter import export_dataset
from synthetic_data.validation import ValidationError


def test_reproducible_prisma_shape():
    a = generate_dataset(GeneratorConfig(seed=7, member_count=300))
    b = generate_dataset(GeneratorConfig(seed=7, member_count=300))
    assert a.records() == b.records()
    assert a.manifest["syntheticStudioId"].count("-") == 4
    assert {"studios", "studioSettings", "members", "membershipPlans", "membershipPeriods",
            "membershipPauses", "attendanceImportBatches", "attendanceRecords",
            "retentionSnapshots", "churnPredictions"} <= a.records().keys()
    validate_dataset(a)


def test_lifecycle_and_timezone_diversity():
    data = generate_dataset(GeneratorConfig(seed=9, member_count=300))
    statuses = {row["status"] for row in data.membershipPeriods}
    assert {"ACTIVE", "PAUSED", "EXPIRED", "CANCELLED"} <= statuses
    assert data.studios[0]["timezone"] != "UTC"
    assert data.retentionSnapshots == []
    assert data.churnPredictions == []
    validate_dataset(data)


def test_timezone_boundaries():
    kolkata = generate_dataset(GeneratorConfig(member_count=300, timezone="Asia/Kolkata"))
    ny = generate_dataset(GeneratorConfig(member_count=300, timezone="America/New_York"))
    assert kolkata.studios[0]["timezone"] == "Asia/Kolkata"
    assert ny.studios[0]["timezone"] == "America/New_York"
    for row in kolkata.attendanceRecords:
        assert row["occurredAt"].endswith("+05:30")
    for row in ny.attendanceRecords:
        assert row["occurredAt"].endswith(("-04:00", "-05:00"))


def test_invalid_tenant_fails_validation():
    data = generate_dataset()
    data.members[0]["studioId"] = "other"
    try:
        validate_dataset(data)
    except ValidationError as error:
        assert "membership" in str(error) or "tenant" in str(error)
    else:
        raise AssertionError("invalid data was accepted")


def test_export_writes_artifact_and_manifest(tmp_path):
    artifact, manifest = export_dataset(generate_dataset(GeneratorConfig(member_count=300)), tmp_path / "dataset.json")
    assert json.loads(artifact.read_text())["manifest"]["schemaVersion"] == "prisma-foundation-v2"
    assert json.loads(manifest.read_text())["syntheticStudioId"]
