# Code Review

Review a focused diff against the task brief and repository instructions.

Prioritize:

- correctness and preservation of existing behavior;
- scope compliance and ownership boundaries;
- tenant isolation and authorization;
- input validation and secure error handling;
- cross-service contract compatibility;
- test coverage for changed behavior;
- secrets, generated files, and unrelated edits.

Do not rewrite or silently commit the author's work. Report blocking findings with file and line references, an impact statement, and a concrete remediation. Label lower-risk improvements separately.
