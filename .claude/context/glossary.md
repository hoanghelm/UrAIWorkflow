# Glossary

Plain-language meaning of the domain terms. Use these names consistently in code and UI.

- **Pack** — a reusable workflow definition (agents, skills, stages, levers, guardrails). Every use case is a pack. Example: `eng-loop`, `tech-diagram`.
- **Workflow** — a pack with concrete inputs, ready to run.
- **Run** — one execution of a workflow. Has a status: `pending`, `running`, `done`, `failed`, `needs_input`.
- **Stage** — one step in a run (e.g. requirement, coding, testing). Has an agent, a model tier, and an optional verifier.
- **Loop** — how a stage runs: plan → act → verify → decide (advance / retry / pause / stop).
- **Guardrail** — an enforced limit on a run: max retries, max loop depth, token/cost budget, timeout, required human gates.
- **Human gate** — a stage that pauses for a person to approve or answer before continuing. Surfaces as `needs_input`.
- **Lever** — a token-saving technique applied during a run: `codegraph`, `rtk`, `ponytail`, `caveman`, `routing`, `disclosure`.
- **Ledger** — the record of tokens consumed vs saved, attributed per lever.
- **Catalog** — the discovered agents, skills, commands, rules, MCP servers, and plugins available to a project.
- **AgentPort** — the seam between the runner and a real coding-agent SDK (Copilot SDK, Claude Agent SDK). Swappable.
