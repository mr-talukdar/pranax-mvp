# PranaX Repository Agent Instructions

These instructions apply to every coding agent and engineering contributor. Tools that do not automatically read this file must be given the relevant `AGENTS.md` file for their scope before implementation begins.

## Project

PranaX is a multi-tenant SaaS platform for Pilates, yoga, and boutique fitness studios. It will cover studio operations, class scheduling, bookings, memberships and class packs, payments and attendance, people management, retention intelligence, analytics, and AI-assisted business insights.

This repository currently establishes the engineering foundation only. Do not implement product features, scaffold applications, create database schemas, or claim deployment readiness unless the task explicitly assigns that work.

## Architecture and boundaries

- `apps/web/`: Next.js and TypeScript frontend. Deployment target: Vercel-compatible projects.
- `services/api/`: Node.js, Express, and TypeScript backend. Deployment target: Google Cloud Run-compatible services.
- `services/intelligence/`: Python and FastAPI analytics and AI service. It has independent dependency management and is not a pnpm workspace member.
- `packages/contracts/`: shared TypeScript API contracts and schemas.
- `packages/config/`: shared non-secret configuration conventions and reusable configuration where appropriate.
- `packages/utils/`: small, dependency-light shared TypeScript utilities.
- `infrastructure/`: deployment descriptions and container organization. Do not add Docker Compose or CI/CD unless explicitly requested.
- `docs/`: architecture, decisions, engineering guidance, product context, and agent process documentation.

The planned data stack is Supabase PostgreSQL with Prisma. Zod is the intended validation mechanism. Python analytics will use NumPy, pandas, and scikit-learn; AI integration is planned around Gemini API and Google ADK. No technology, API, schema, or integration is to be assumed complete until it exists in the repository or is documented as a decision.

## Mandatory agent behavior

1. Inspect existing code, configuration, tests, and documentation before modifying anything.
2. Work only within the files and directories allocated for the task. Avoid unrelated edits.
3. Never overwrite or silently discard another agent's work. Coordinate overlapping changes and preserve concurrent edits.
4. Avoid unnecessary dependencies and do not install packages without a dependency need established by the task.
5. Never invent APIs, database tables or columns, RPC procedures, environment variables, credentials, or external behavior. Mark unknowns as TBD and ask when a choice is blocking.
6. Never commit secrets or credentials. Use placeholders only in examples, and never add real environment files or credential material.
7. Document architectural decisions that change boundaries, ownership, data flow, or durable conventions using an ADR.
8. Run the smallest relevant checks before declaring completion, then broader checks when the change warrants them.
9. Report changed files, decisions made, unresolved issues, and verification performed.

## Coding standards

- Prefer small, explicit modules with clear ownership and a single responsibility.
- Keep public APIs documented at the boundary; avoid comments that repeat implementation.
- Follow existing formatter and lint conventions once applications exist. Do not introduce a toolchain merely for organization.
- Preserve backward compatibility at cross-service boundaries.
- Keep secret and environment-dependent behavior outside domain logic.
- Do not add speculative abstractions, feature flags, fallbacks, or compatibility layers.

### TypeScript

- Use strict TypeScript and explicit public types.
- Prefer `unknown` over `any`; validate external and untyped input.
- Use Zod at runtime boundaries and share cross-service contracts from `packages/contracts/`.
- Use ES modules consistently. Naming:
  - camelCase for variables and functions.
  - PascalCase for types, classes, interfaces, components, and enums.
  - kebab-case for package and directory names.
  - Environment variable names use `UPPER_SNAKE_CASE`.
- Async operations must propagate or handle failures deliberately.

### Python

- Use Python 3.12+ unless an existing project explicitly establishes another supported baseline.
- Use type hints for public functions and external boundaries.
- Keep dependency management independent in `services/intelligence/` using an existing or task-approved project manager.
- Follow PEP 8 and use clear snake_case names. PascalCase is for classes.
- Validate external input and fail with actionable exceptions; do not catch broad exceptions silently.

## Error handling and logging

- Return or raise stable, typed errors; include a user-safe message and enough server context to diagnose the failure.
- Log structured, contextual information without secrets, passwords, tokens, personal data, or complete request bodies.
- Correlate cross-service requests when correlation identifiers exist.
- Do not use log-and-swallow patterns or fabricate success responses after failures.

## Testing

- Test behavior at the narrowest relevant level: unit tests for isolated logic, integration tests for boundaries, and end-to-end tests for critical workflows once those applications exist.
- Add focused tests for behavior changes and boundary validation.
- Do not assert implementation details where observable behavior is available.
- Record test commands and outcomes in the completion report.

## Security and multi-tenancy

- Apply least privilege and explicit authorization to every request and operation.
- Every tenant-owned data operation must enforce tenant scope on the server. Never trust a tenant identifier supplied only by a client.
- Define and document tenant identity propagation before implementing tenant-aware features.
- Validate, sanitize, and size-limit external input as required by the boundary.
- Never log secrets or sensitive personal data.
- Review authentication, authorization, data access, and third-party integrations before merging.

## Environment variables

- Names must be declared and documented before use.
- Commit only non-secret `.env.example` templates if and when examples are required.
- Keep local, test, preview, staging, and production values separate.
- Frontend variables may be public only when explicitly safe; do not place secrets in browser-bundled code.

## Documentation

- Update directly affected architecture or engineering docs with implementation changes.
- Add an ADR for a durable architectural choice using `docs/decisions/`.
- Keep placeholders factual and label unresolved items as TBD.
- Do not duplicate instructions across files; specialized files must inherit this file and state only their additional ownership.

## Git and pull requests

- Create a separate branch or worktree for concurrent agent work.
- Prefer focused commits with a clear imperative subject.
- Rebase only local unshared work; do not rewrite shared history.
- Use the pull request template and report architectural impact and security considerations.
- Resolve the root scope owner for cross-cutting changes before editing shared files.
