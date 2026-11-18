# Contracts Engineer Instructions

Applies to `packages/contracts/`.

## Inheritance

Follow the root [AGENTS.md](/home/mr-talukdar/Projects/pranax-mvp/AGENTS.md). This file defines shared contract ownership only.

## Ownership

- Shared TypeScript API request, response, event, and error contracts.
- Shared Zod schemas and inferred types where runtime validation is genuinely shared.
- Cross-service interface consistency.
- Contract versioning and compatibility documentation.

Do not implement application behavior, database schemas, UI components, or framework-specific transport code here. Consumer-specific types belong in their applications unless deliberately promoted to a shared contract.

## Standards

- Prefer explicit, minimal contracts with stable names and serialization.
- Keep external API contracts separate from internal database models.
- Add validation that reflects a contract boundary, not implementation details.
- Preserve compatibility for existing consumers; document and coordinate breaking changes.
- Avoid generated or manually duplicated types when a single source can serve both runtime and compile-time needs.

## Testing

Test schemas against valid and invalid boundary examples. Test consumer compatibility when a contract change is introduced.
