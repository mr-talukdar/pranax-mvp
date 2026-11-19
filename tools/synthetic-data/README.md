# PranaX Synthetic Data Factory

This standalone Python package generates deterministic, fictional studio data without connecting to PostgreSQL. It exports a versioned JSON artifact and manifest consumed by the TypeScript Prisma seed loader.

```bash
PYTHONPATH=tools/synthetic-data/src \
  python3 -m synthetic_data.cli --members 350 --output datasets/synthetic-data-v1.2.0.json
.venv/bin/pytest tools/synthetic-data/tests
```

The generator supports 300–500 members, exactly twelve months of history, fixed seeds, explicit coverage, lifecycle-consistent memberships, and the ten controlled scenarios in the synthetic-data skill. Archetypes and scenario identifiers are generation metadata, not operational member attributes or retention features.
