# Security Review

Use this instruction for changes involving authentication, authorization, tenancy, personal data, secrets, external services, model access, payments, or infrastructure.

Review the complete data flow, including:

- tenant identity source and propagation;
- authorization checks at every tenant-owned operation;
- secret handling and environment variable exposure;
- external input and output validation;
- logging and observability for sensitive data;
- third-party provider data handling;
- dependency and deployment privilege changes.

Do not treat a UI control or client token claim as a security boundary. Report exploitable or likely-risky behavior as a blocking finding, with impact, evidence, and a recommended fix. Mark unknown threat context as TBD rather than inventing requirements.
