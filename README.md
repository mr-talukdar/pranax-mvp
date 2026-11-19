# PranaX MVP

PranaX is a multi-tenant SaaS foundation for Pilates, yoga, and boutique fitness studios.

## Repository status

The repository contains the initial application, database, and synthetic-data foundations. Product workflows remain intentionally minimal: the web app exposes a health-oriented shell and server-side studio-scoped member endpoints behind a development demo context, while the intelligence service exposes a health endpoint.

## Planned structure

- `apps/web`: Next.js frontend
- `apps/web`: Next.js application and server-side route boundary
- `services/intelligence`: FastAPI intelligence service
- `packages/contracts`: shared TypeScript contracts
- `packages/database`: Prisma schema, client, migrations, and seed loader
- `packages/config`: shared configuration
- `packages/utils`: shared utilities
- `tools/synthetic-data`: standalone Python generator and validator
- `datasets`: generated synthetic artifacts (ignored except for placeholders)
- `infrastructure`: container and deployment organization
- `docs`: architecture and engineering documentation

## Workspace

The pnpm workspace includes `apps/*` and `packages/*`. Python in `services/intelligence` is intentionally excluded and has independent dependency management.

From the repository root:

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Database commands require `DATABASE_URL` and `DIRECT_URL`:

```bash
pnpm db:generate
pnpm db:validate
pnpm --filter @pranax/database migrate:check
```

Generate and validate a deterministic synthetic dataset without database access:

```bash
PYTHONPATH=tools/synthetic-data/src \
  python3 -m synthetic_data.cli --members 350 --output datasets/synthetic-data-v1.2.0.json
```

The Python factory never connects to PostgreSQL. Only the TypeScript Prisma seed loader may load an explicitly synthetic studio, and it refuses datasets that do not identify one synthetic tenant.

## Local configuration

Copy `.env.example` to an environment-specific local configuration and provide database values only when a local or authorized development PostgreSQL instance is available. Studio authorization is resolved by verified Supabase Auth identity and `StudioUser` membership; browser studio selection is never authorization proof.

## Agent instructions

Read [AGENTS.md](AGENTS.md) before work. Use the nearest specialized instruction file for a concrete scope:

- [apps/web/AGENTS.md](apps/web/AGENTS.md)
- [services/intelligence/AGENTS.md](services/intelligence/AGENTS.md)
- [packages/contracts/AGENTS.md](packages/contracts/AGENTS.md)

Reusable coordination guidance is available under [`.agents/`](.agents/) and [docs/agents/agent-coordination.md](docs/agents/agent-coordination.md).
