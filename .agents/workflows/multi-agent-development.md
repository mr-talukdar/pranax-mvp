# Multi-Agent Development Workflow

Agents should use separate Git branches or Git worktrees for concurrent work. One task brief is the scope contract; not every agent should edit shared or unassigned files.

## 1. Task definition

Define the objective, acceptance criteria, ownership, exclusions, dependencies, tests, and deliverables. Record the task in an instance of `.agents/tasks/TASK_TEMPLATE.md`.

## 2. Scope allocation

Assign an owning agent and explicit file/directories. Identify shared files and select a single integration owner for them. Ensure agents inherit `AGENTS.md` instructions relevant to their scope.

## 3. Independent implementation

Each agent works on its branch or worktree and inspects existing code before editing. Rebase or merge the latest approved shared context only as assigned, and never overwrite another agent's changes.

## 4. Code review

Review against the task brief and reuse `.agents/instructions/code-review.md`. Trigger `.agents/instructions/security-review.md` for security-sensitive changes.

## 5. Integration

The integration owner combines compatible changes, resolves only allocated conflicts, updates shared contracts, and records cross-cutting decisions.

## 6. Testing

Run affected service tests and shared contract checks. Follow `.agents/instructions/testing-and-quality-assurance.md`. Do not merge unresolved task failures.

## 7. Merge

Create or update the pull request, complete its template, and verify only owned scope is included. Merge only after required review and checks. Delete temporary branches or worktrees after integration if the repository convention permits.

## Agent tool usage

Root and specialized `AGENTS.md` files are plain repository instructions reusable by Copilot and other coding agents. A tool may be given the relevant file in its task context or asked to read it. The `.agents/` directory contains reusable process instructions, task templates, and workflows for tools that do not automatically discover agent instruction files.
