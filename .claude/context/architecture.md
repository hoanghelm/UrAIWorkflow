# Architecture map

VCC-Workflow is a local-first AI workflow platform. Three packages in one pnpm monorepo.

## packages/schema (`@vcc-workflow/schema`)
The contract. Zod schemas + inferred types for everything shared: `guardrails`, `pack`, `workflow`, `run`, `ledger`, `catalog`. API and web both import from here. Change a shape here first, everywhere else follows.

## apps/api (NestJS + Prisma + SQLite)
The control API and local daemon. Feature modules under `src/modules`:

- **catalog** — scans a project's `.claude/{agents,skills,commands,rules}`, `.mcp.json`, and plugins into a unified list. This is how the dashboard discovers what a project has.
- **packs** — template packs (eng-loop, tech-diagram) and the registry. A pack is a reusable workflow definition.
- **workflow** — turns a pack + inputs into a runnable workflow.
- **runner** — the loop engine. Runs a workflow stage by stage: plan → act → verify → decide. Enforces guardrails (retries, loop depth, budget, human gates), writes checkpoints, records ledger entries, and streams events over socket.io namespace `/runs`. Agent execution is behind `AgentPort` — the runner never talks to an SDK directly.
- **ledger** — per-lever token attribution and run/project summaries.

Data: SQLite via Prisma (`prisma/schema.prisma`), WAL mode. Config on disk (`.claude`, `.mcp.json`), operational data in the DB.

## apps/web (React + Vite + AntD + Tailwind + ReactFlow + Rematch)
The dashboard. Key rule: **every third-party UI is wrapped** in `src/components/ui`; features import only from `@/components/ui`.

- `store/` — Rematch models (`projects`, `catalog`, `packs`, `runs`) + typed hooks.
- `lib/api.ts` — the only place HTTP happens. `lib/ws.ts` — the only place socket.io happens.
- `features/` — pages composed from wrapped UI + store.

## Data flow of a run
Pick a pack → `workflow.fromPack` builds a workflow → `runner.create` starts it → runner executes stages, emitting events → web subscribes via `/runs` and renders live status, logs, and the ledger.
