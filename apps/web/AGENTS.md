# Frontend Engineer Instructions

Applies to `apps/web/`.

## Inheritance

Follow the root [AGENTS.md](/home/mr-talukdar/Projects/pranax-mvp/AGENTS.md). This file defines frontend ownership only.

## Ownership

- Next.js application structure, routing, layouts, rendering strategy, and Vercel-compatible configuration.
- Accessible UI components and responsive product experiences.
- Client/server state management and cache behavior.
- Typed API integration and contract consumption.
- Frontend validation, loading and error states, and testing.
- Frontend environment variable declarations.

Do not implement backend routes, business authorization, database access, or analytics service logic here. Coordinate API shapes with the backend and contracts owners.

## Standards

- Use semantic HTML and preserve keyboard, screen-reader, focus, color-contrast, and motion accessibility.
- Keep server and client boundaries explicit; avoid unnecessary client components.
- Consume approved contracts rather than duplicating response types.
- Validate external data at integration boundaries and render safe error states.
- Keep tenant selection and authorization server-enforced; never use UI state as an authorization control.
- Do not place secrets or private service credentials in browser code.

## Testing

Cover rendering, interaction, accessibility-critical behavior, API integration boundaries, and user-visible error states with the lightest existing test layer. Do not add dependencies until a scaffolded project establishes a test need.
