# ADR-005: Guarded studio analytics assistant

## Status

Accepted

## Context

The product calls for conversational questions about a studio's own operations. A general-purpose prompt-to-Gemini endpoint would allow unsupported questions, expose more data than needed, and provide no enforceable boundary around model behavior. The existing architecture assigns user authentication, tenant authorization, and operational database access to Next.js; the intelligence service has no database connection.

## Decision

- Next.js authenticates each request and establishes the active studio through the existing verified studio context. It first sends only the bounded question and current-session history to the intelligence scope router. If the router approves an operation, Next.js obtains the dashboard summary under `withVerifiedStudioContext` and projects it into a small aggregate-only assistant contract.
- The browser cannot submit a studio ID or analytics snapshot. The Next.js server adds the studio ID from its verified context when calling the intelligence service with the existing service bearer token.
- The intelligence service accepts only four predefined read-only operations: attendance summary, membership summary, retention summary, and studio overview. A deterministic operation router rejects unsupported topics, individual-member requests, mutations, and advice before any analytics snapshot is requested or any question is sent to Gemini.
- The service computes operation evidence from the typed aggregate snapshot. Gemini receives only a server-owned canonical question and the chosen operation's evidence; raw user text and conversation history are not sent to the model. The model never receives database credentials, member identifiers, names, or contact information. Answers must cite evidence identifiers, and unsupported numeric claims are rejected in favor of a deterministic evidence summary.
- Gemini selects suggestions from a fixed set of available operation IDs based on aggregate analytics. Server-owned text supplies the actual suggested questions.
- `GEMINI_API_KEY` is optional and belongs in the intelligence service runtime. Missing keys and invalid/unavailable Gemini responses use deterministic suggestions or grounded summary wording.
- The UI keeps a short conversation in browser memory only. There is no chat persistence, autonomous agent loop, arbitrary SQL, or write operation.

## Consequences

- The assistant can answer current studio attendance, aggregate membership, aggregate retention, and high-level overview questions. Individual member lookup and other product areas remain out of scope.
- The server-side scope router is intentionally conservative; ambiguous questions receive a retry message rather than being sent to Gemini.
- Aggregate metrics are minimized before the intelligence service call, and individual PII is excluded from all model prompts.
- Vercel must retain `INTELLIGENCE_URL` and `INTELLIGENCE_SERVICE_TOKEN`; Gemini must be configured separately in the intelligence service runtime. If it is absent, the bounded assistant still returns deterministic results.
- The current in-memory conversation is not available across browsers or sessions and is not retained for audit.
