# VCC-Workflow

Local-first AI workflow platform. It runs on your machine, executes workflows one stage at a time under enforced guardrails, and reports tokens used and tokens saved. Every use case is a pack; a workflow is a pack whose loop has stages.

## How it works

You add a task as a card on the board. The runner turns it into a workflow and executes it one stage at a time. It plans the work, acts on it inside an isolated git worktree, verifies the result by running tests and checks, then decides whether to finish, retry, or stop. Guardrails cap retries, loop depth, token budget, and stage time, so a run never spins forever. Progress streams to the dashboard live over `/runs`, and every token is attributed per lever in the ledger, so you can see what each step cost and saved.

Reusable work lives in packs. A pack defines the stages, levers, and guardrails for a use case; a workflow is a pack made runnable for a project. The catalog loads the agents, skills, commands, rules, and MCP servers already configured on your machine, so runs use your own setup instead of a fixed toolset. Connectors decide which model provider a run talks to, and keys stay on your machine.

## Layout

```
apps/
  api/     NestJS API and local daemon. SQLite via Prisma, run logs over socket.io.
  web/     React dashboard. AntD, Tailwind, ReactFlow, Rematch.
packages/
  schema/  @vcc-workflow/schema. Zod contracts shared by api, runner, and web.
```

## Modules (api)

- catalog: discovers agents, skills, commands, rules, MCP, and plugins from each project's `.claude` and `.mcp.json`, and from your machine-wide `~/.claude`. Ships 30 built-in agents and 17 skills as template fallbacks, seeded on boot.
- packs: template packs (eng-loop, tech-diagram) and the registry.
- workflow: builds a runnable workflow from a pack.
- runner: the loop engine. It runs plan, act, verify, and decide with guardrails (retries, loop depth, budget, human gates), checkpoints, and live events over `/runs`.
- ledger: per-lever token attribution and run and project summaries.

## Conventions

- TypeScript everywhere. `@vcc-workflow/schema` is the single source of truth.
- The web app never imports a component library directly. Everything is wrapped under `apps/web/src/components/ui`.
- Local-first: config as files, operational data in SQLite. Agent execution sits behind `AgentPort`, implemented by `AgentRouter`, which sends each stage to the active connector's adapter.

## Getting started

```
pnpm install
pnpm --filter @vcc-workflow/schema build
cp apps/api/.env.example apps/api/.env
pnpm --filter @vcc-workflow/api prisma:generate
pnpm --filter @vcc-workflow/api prisma:migrate
pnpm dev
```

Built-in agents, skills, tools, MCPs, and the 12 template packs seed on API boot, so a clean checkout is populated the first time the API starts. The SQLite database (`apps/api/prisma/data/`) is git-ignored and stays on the machine; only migrations and code travel.

`apps/api/prisma/seed.ts` seeds no demo data. Register a workspace to scan its `.claude` files; your `~/.claude` files load automatically as local-scope components.

- API: http://localhost:3001/api. Swagger: http://localhost:3001/api/docs
- Web: http://localhost:5173

## Run on Linux

No Windows-only APIs and no native addons to compile; Prisma runs through its downloaded engine. You need Node 20 or later, pnpm, and git.

```
git clone https://github.com/hoanghelm/UrAIWorkflow.git && cd UrAIWorkflow
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm --filter @vcc-workflow/schema build
pnpm --filter @vcc-workflow/api prisma:generate
pnpm --filter @vcc-workflow/api prisma:migrate
pnpm dev
```

Do not copy a Windows `node_modules` across. It is git-ignored, so clone and `pnpm install` fetch the correct Linux binaries.

Notes:

- git is required for worktrees and artifact collection.
- Build and deploy previews and the Figma and Playwright MCPs shell out to npm and npx. Playwright also needs `npx playwright install` and its system libraries.
- Alpine or musl (Docker): Prisma's `binaryTargets` defaults to `native`, which is correct when you build and run on the same image. For Alpine, add `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` to the Prisma generator and re-run `prisma generate`.

## Run with Docker

```
docker compose up --build
```

- Web: http://localhost:5173. API and Swagger: http://localhost:3001/api/docs
- Built-ins and template packs seed on first boot; migrations apply automatically.
- The SQLite database and collected artifacts persist in named volumes (`vcc-db`, `vcc-artifacts`).
- Activate a model connector on the Connectors page to run agents. Your API key stays in the local database, never in the image.

The image uses a Debian (glibc) base so the Prisma engine and native binaries load. See `Dockerfile` and `docker-compose.yml`.

## Run hosted (PostgreSQL)

The same codebase runs two ways, chosen at boot by `DEPLOYMENT_MODE`:

- `local` (default): SQLite on disk, no auth.
- `hosted`: PostgreSQL, and every route except `/api/health` and `/api/docs` needs `Authorization: Bearer <HOSTED_ACCESS_TOKEN>`.

Three entry points:

```
pnpm start:local     # local app on SQLite (default, no setup)
pnpm server:dev      # server mode locally: starts a local Postgres, then runs the app
HOSTED_ACCESS_TOKEN=your-long-random-token pnpm server   # full hosted stack in Docker
```

- `pnpm server:dev` starts a local `postgres:16` (via `docker-compose.db.yml` on `localhost:5432`), applies the Postgres migrations, and runs the app in hosted mode with a `dev-token` (override with `HOSTED_ACCESS_TOKEN`). Requires Docker.
- `pnpm server` builds and runs the app and Postgres as containers (`docker-compose.hosted.yml`). The app waits for the database, migrates, then starts. It refuses to start without `HOSTED_ACCESS_TOKEN`.
- The database persists in the `vcc-pg` volume; the default database name is `vcc`.

Postgres uses a generated schema (`prisma/postgres/schema.prisma`) kept in sync with the SQLite schema. After changing `prisma/schema.prisma`, regenerate it and add a migration:

```
pnpm --filter @vcc-workflow/api gen:pg-schema
pnpm --filter @vcc-workflow/api exec prisma migrate dev --schema=prisma/postgres/schema.prisma --name <change>
```

Connector API keys are encrypted at rest in both modes (`VCC_ENCRYPTION_KEY`, or a generated local key file). Hosted mode is lightweight: one shared access token, no per-user tenants or managed model keys.

## Agent adapters

Agent execution sits behind `AgentPort`, implemented by `AgentRouter` (`runner/agent.router.ts`). Each run stage is routed to the adapter for the connector you activate, so the runner never depends on a single model provider. Provider adapters live next to it as `runner/agent.*.ts`. Add and activate a connector on the Connectors page; with none set, the runner uses a no-op stub so the loop still completes.
