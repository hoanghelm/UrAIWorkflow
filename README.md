# VCC-Workflow

Local-first, token-efficient AI workflow platform. Runs on the engineer's laptop, executes workflows stage-by-stage under enforced guardrails, and reports tokens consumed vs saved. Every use case is a **pack**; every workflow is a pack whose loop has stages.

## Layout

```
apps/
  api/      NestJS control API + local daemon (SQLite via Prisma, socket.io run logs)
  web/      React dashboard (AntD + Tailwind + ReactFlow + Rematch)
packages/
  schema/   @vcc-workflow/schema — zod contracts shared across api, runner and web
```

## Modules (api)

- **catalog** — discovers agents / skills / commands / rules / MCP / plugins from each project's `.claude` and `.mcp.json` (scope `project`) **and** from your machine-wide `~/.claude` (scope `user` / "local"). Ships 30 built-in agents and 17 skills (real, detailed definitions in `catalog/real-blocks.ts`) as `template`-scope fallbacks, seeded on boot.
- **packs** — template packs (eng-loop, tech-diagram) + registry.
- **workflow** — builds a runnable workflow from a pack.
- **runner** — the loop engine: plan → act → verify → decide, with guardrails (retries, loop depth, budget, human gates), checkpoints, and live events over `/runs`.
- **ledger** — per-lever token attribution and run/project summaries.

## Conventions

- TypeScript everywhere. `@vcc-workflow/schema` is the single source of truth.
- The web app never imports a component library directly — everything is wrapped under `apps/web/src/components/ui`.
- Local-first: config as files, operational data in SQLite. Agent execution is behind `AgentPort`; swap `StubAgentAdapter` for a Copilot SDK / Claude Agent SDK adapter.

## Getting started (fresh clone / new machine)

```
pnpm install
pnpm --filter @vcc-workflow/schema build
cp apps/api/.env.example apps/api/.env
pnpm --filter @vcc-workflow/api prisma:generate
pnpm --filter @vcc-workflow/api prisma:migrate   # applies committed migrations, creates the SQLite DB
pnpm dev
```

Nothing else to seed. The built-in agents, skills, tools, MCPs and the 12 template packs are seeded **idempotently on API boot** (`CatalogService` + `PacksService` `onModuleInit`), so a clean checkout is fully populated the first time the API starts. The SQLite database (`apps/api/prisma/data/`) is git-ignored and never travels between machines — only the committed migrations and code do, which is why the result is deterministic.

`apps/api/prisma/seed.ts` intentionally seeds **no** demo/fake data. Register a workspace in the app to scan its local `.claude` files; your machine-wide `~/.claude` files load automatically as **local**-scope components.

- API: http://localhost:3001/api · Swagger: http://localhost:3001/api/docs
- Web: http://localhost:5173

## Next: real agent adapter

Implement `AgentPort.runStage` in a new `apps/api/src/modules/runner/agent.copilot.ts` against the GitHub Copilot SDK (`onPostToolUse` for tool-output compression, per-request model switch for phase routing), then bind it in `runner.module.ts` in place of `StubAgentAdapter`.
