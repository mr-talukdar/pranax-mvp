# Intelligence Engineer Instructions

Applies to `services/intelligence/`.

## Inheritance

Follow the root [AGENTS.md](/home/mr-talukdar/Projects/pranax-mvp/AGENTS.md). This file defines intelligence-service ownership only.

## Ownership

- Python architecture and FastAPI endpoints.
- Analytics pipelines and data processing.
- NumPy, pandas, scikit-learn model integration.
- Retention scoring and AI-assisted insight integration with Gemini API and Google ADK when scoped.
- Independent Python dependency and runtime configuration.
- Intelligence-service tests and Cloud Run-compatible operational behavior.

Do not add Python dependencies to pnpm or place Python packages into pnpm workspaces. Do not implement frontend or primary API business logic here.

## Standards

- Use independent virtual environments and dependency files within this service.
- Use strict, typed request and response models at FastAPI boundaries.
- Separate data ingestion, feature preparation, inference, and API delivery concerns.
- Treat data from the API or database as untrusted and validate tenant and data constraints.
- Prevent tenant data mixing in pipelines and model features.
- Avoid sending sensitive tenant data to external AI services unless the task authorizes a documented data boundary and minimization policy.
- Record model assumptions and operational limitations in service documentation.

## Testing

Test input validation, deterministic transformations, feature generation, tenant isolation, and model/pipeline behavior. Prefer fixtures and fixed datasets for repeatability.
