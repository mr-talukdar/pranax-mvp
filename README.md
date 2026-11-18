# PranaX MVP

PranaX is a multi-tenant SaaS foundation for Pilates, yoga, and boutique fitness studios.

## Repository status

This repository currently contains an organizational monorepo foundation, engineering instructions, and architecture placeholders. Product applications and database schemas have not been scaffolded.

## Planned structure

- `apps/web`: Next.js frontend
- `services/api`: Express API
- `services/intelligence`: FastAPI intelligence service
- `packages/contracts`: shared TypeScript contracts
- `packages/config`: shared configuration
- `packages/utils`: shared utilities
- `infrastructure`: container and deployment organization
- `docs`: architecture and engineering documentation

## Workspace

The pnpm workspace includes `apps/*`, `services/api`, and `packages/*`. Python in `services/intelligence` is intentionally excluded and has independent dependency management.

From the repository root:

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

These commands are no-op or conditional until workspace packages provide the corresponding scripts.

## Agent instructions

Read [AGENTS.md](AGENTS.md) before work. Use the nearest specialized instruction file for a concrete scope:

- [apps/web/AGENTS.md](apps/web/AGENTS.md)
- [services/api/AGENTS.md](services/api/AGENTS.md)
- [services/intelligence/AGENTS.md](services/intelligence/AGENTS.md)
- [packages/contracts/AGENTS.md](packages/contracts/AGENTS.md)

Reusable coordination guidance is available under [`.agents/`](.agents/) and [docs/agents/agent-coordination.md](docs/agents/agent-coordination.md).
