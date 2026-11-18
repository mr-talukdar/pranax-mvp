# System Overview

PranaX is planned as a multi-tenant SaaS platform for boutique fitness studios.

## Planned components

- **Web application:** Next.js and TypeScript, deployed to a Vercel-compatible frontend project.
- **Backend API:** Node.js and Express with TypeScript, deployed to Google Cloud Run-compatible infrastructure.
- **Intelligence service:** Python and FastAPI for analytics, retention scoring, and AI-assisted insights.
- **Shared contracts:** TypeScript API contracts and schemas consumed across TypeScript boundaries.
- **Data platform:** Supabase PostgreSQL with Prisma as the intended ORM. These choices are constraints pending implementation validation.

## Data flow

Browser clients communicate with the web application and backend APIs. The backend owns primary application authorization and data access. The intelligence service receives explicitly authorized data or requests for analytics and AI operations. External AI and provider integrations remain outside application data boundaries unless individually documented.

## Deployment status

No application is scaffolded and no deployment configuration is active. Deployment remains TBD.
