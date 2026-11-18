# Agent Coordination

Agents use repository instructions as follows:

1. Read root `AGENTS.md`.
2. Read the specialized `AGENTS.md` for the assigned directory.
3. Read reusable `.agents/instructions/` guidance applicable to the task.
4. Work from a task brief based on `.agents/tasks/TASK_TEMPLATE.md`.
5. Follow `.agents/workflows/multi-agent-development.md`.

For tools that discover instructions automatically, specialized scope files should be supplied or referenced for the relevant directory. For tools that do not automatically discover them, explicitly add the root and specialized files to context.

The coordination model requires separate branches or worktrees for concurrent implementation. It does not allow agents to infer or modify files outside their allocation.
