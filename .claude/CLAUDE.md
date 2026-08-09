# VCC-Workflow — Project Rules

Local-first, token-efficient AI workflow platform. Monorepo: NestJS API (`apps/api`), React dashboard (`apps/web`), shared zod contracts (`packages/schema`).

## Non-negotiables

- **Schema is the source of truth.** All pack / workflow / guardrails / run / ledger / catalog shapes live in `@vcc-workflow/schema` as zod. API and web import from there; never redefine a shape locally.
- **Wrap every UI library.** The web app never imports `antd` or `@xyflow/react` outside `apps/web/src/components/ui`. Features import from `@/components/ui`.
- **Local-first.** Config is files on disk (`.claude`, `.mcp.json`, worktrees). Operational data is SQLite via Prisma. No cloud dependency for execution.
- **No code comments.** Code is self-documenting through naming and types.
- **Guardrails are enforced, not advisory.** The runner honors `maxRetries`, `maxLoopDepth`, `budget`, `stageTimeoutMs`, and `onBreach` on every run.
- **Spend tokens on the change, not on rediscovery.** Start every coding task with the `token-efficient-coding` skill (CodeGraph → Ponytail → Caveman).

## The harness

**Context** (read for grounding): `.claude/context/architecture.md`, `conventions.md`, `glossary.md`.

**Agents** (delegate work): `backend-engineer`, `frontend-engineer`, `schema-engineer`, `reviewer`.

**Skills** (how-to, load on demand): `token-efficient-coding`, `nestjs-module`, `prisma-model`, `rematch-model`, `ui-wrapper`, `workflow-pack`.

**Commands** (scaffold): `/new-module`, `/new-ui`, `/new-store-model`, `/new-pack`.

**Tools**: `.claude/rules/tools.md` — CodeGraph (MCP), Ponytail, Caveman.

**Area rules**: `.claude/rules/backend.md`, `frontend.md`, `schema.md`, `tools.md`.
