# Multi-Tenancy

PranaX is intended to operate as a multi-tenant SaaS platform. The final tenancy model is TBD and must be established before tenant-aware data implementation.

## Required invariant

Every server-side operation over tenant-owned data must establish a trusted tenant scope and enforce it independent of client-provided UI state.

## Decisions pending

- tenant identifier source and propagation;
- Supabase/PostgreSQL isolation pattern;
- authorization model and role hierarchy;
- management of cross-tenant operations;
- retention, export, and deletion behavior;
- analytics and model isolation;
- audit and correlation requirements.

Do not infer or implement a tenant model in advance of an approved ADR. Mark all unresolved choices as TBD.
