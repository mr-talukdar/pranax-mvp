from __future__ import annotations

import json
from pathlib import Path

from .models import Dataset
from .validation import validate_dataset


def export_dataset(dataset: Dataset, output: str | Path) -> tuple[Path, Path]:
    validate_dataset(dataset)
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(dataset.records(), indent=2, sort_keys=True) + "\n", encoding="utf-8")
    manifest_path = output.with_name(output.stem + ".manifest.json")
    manifest_path.write_text(json.dumps(dataset.manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return output, manifest_path
