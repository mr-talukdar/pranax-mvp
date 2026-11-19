"""Command line entry point for generating an artifact."""
from __future__ import annotations
import argparse
from pathlib import Path
from .exporter import export_dataset
from .generator import GeneratorConfig, generate_dataset

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("datasets/synthetic-data-v1.2.0.json"))
    parser.add_argument("--seed", type=int, default=20251120)
    parser.add_argument("--members", type=int, default=350)
    args = parser.parse_args()
    config = GeneratorConfig(seed=args.seed, member_count=args.members)
    artifact, manifest = export_dataset(generate_dataset(config), args.output)
    print(f"wrote {artifact} and {manifest}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
