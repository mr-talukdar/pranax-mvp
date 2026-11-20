"""Command line entry point for generating an artifact."""
from __future__ import annotations
import argparse
from pathlib import Path
from .exporter import export_dataset
from .generator import GeneratorConfig, generate_dataset

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("datasets/synthetic-demo-ars-pilates-v1.3.0.json"))
    parser.add_argument("--seed", type=int, default=20261120)
    parser.add_argument("--members", type=int, default=350)
    parser.add_argument("--months", type=int, default=15)
    parser.add_argument("--evaluation-date", type=str, default="2026-11-20")
    parser.add_argument("--timezone", type=str, default="Asia/Kolkata")
    parser.add_argument("--studio-name", type=str, default="ARS Pilates & Fitness")
    parser.add_argument("--branch", type=str, default="Salt Lake Studio")
    parser.add_argument("--studio-id", type=str, default="d9b73462-1111-4000-8000-000000000001")
    args = parser.parse_args()
    config = GeneratorConfig(
        seed=args.seed,
        member_count=args.members,
        months=args.months,
        evaluation_date=args.evaluation_date,
        timezone=args.timezone,
        studio_name=args.studio_name,
        branch=args.branch,
        studio_id=args.studio_id,
    )
    artifact, manifest = export_dataset(generate_dataset(config), args.output)
    print(f"wrote {artifact} and {manifest}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
