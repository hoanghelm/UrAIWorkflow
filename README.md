# VCC-Workflow

> Run AI coding tasks as guarded, staged workflows on your own machine, and account for the tokens each run spends and saves.

A task enters as a card, becomes a workflow, and runs stage by stage under enforced limits. Every use case is a **pack**; a workflow is a pack whose loop has stages.

## Architecture

The run loop, stage by stage:

| Stage | What happens | Result |
| --- | --- | --- |
| **Plan** | Break the card into a plan and sub-tasks | A workflow ready to execute |
| **Act** | Apply changes in an isolated git worktree through the active connector | Edits and diffs |
| **Verify** | Run the project's tests and checks | A pass or fail signal |
| **Decide** | A pass completes the run, a fail retries, a guardrail breach stops it | Complete, retry, or stop |

The pieces around the loop:

| Component | Role |
| --- | --- |
| **Board** | A task starts here as a card |
| **Runner** | Executes the loop and enforces guardrails: retries, loop depth, budget, stage time |
| **Git worktree** | Isolated workspace so each run's changes stay contained |
| **Connector** | Selects the model provider for the run; credentials stay local |
| **Realtime gateway** | Streams run events to the dashboard over `/runs` |
| **Ledger** | Attributes tokens per lever and summarizes per run and project |

## Highlights

- **Staged runs.** Each run walks plan, act, verify, decide, with automatic retries and a clean stop condition.
- **Enforced guardrails.** Caps on retries, loop depth, token budget, and stage time bound every run.
- **Isolated execution.** Work happens in a dedicated git worktree, so changes stay contained and reviewable.
- **Live progress.** Run events stream to the dashboard over a socket.
- **Token accounting.** The ledger attributes usage per lever and summarizes per run and project.
- **Your toolset.** The catalog loads agents, skills, commands, rules, and MCP servers already on the machine.
- **Pluggable providers.** Connectors select the model provider per run, and credentials stay local.
- **Two deployment modes.** SQLite locally, or PostgreSQL with token auth when hosted.

## Layout

```
apps/
  api/     NestJS API and local daemon. SQLite via Prisma, run logs over socket.io.
  web/     React dashboard. AntD, Tailwind, ReactFlow, Rematch.
packages/
  schema/  @vcc-workflow/schema. Zod contracts shared by api, runner, and web.
```

## Modules (api)

| Module | Responsibility |
| --- | --- |
| `catalog` | Discovers agents, skills, commands, rules, MCP, and plugins from each project's `.claude` and `.mcp.json`, and from the machine-wide `~/.claude`. Ships 30 built-in agents and 17 skills as template fallbacks, seeded on boot. |
| `packs` | Template packs (eng-loop, tech-diagram) and the registry. |
| `workflow` | Builds a runnable workflow from a pack. |
| `runner` | The loop engine. Runs plan, act, verify, and decide with guardrails, checkpoints, and live events over `/runs`. |
| `ledger` | Per-lever token attribution, and run and project summaries. |

## Connectors

A connector holds the provider type and credentials the runner uses to reach a model. Set them up on the Connectors page in the app.

| Type | How it authenticates |
| --- | --- |
| API key | Bring your own key for a model provider |
| Subscription | Sign in once with the provider's CLI on the machine |
| GitHub Copilot | Device sign-in with your Copilot account |

- One connector is active per project, and you can switch it any time.
- Keys are encrypted at rest with `VCC_ENCRYPTION_KEY` (or a generated local key file).
- With no connector set, the runner falls back to a no-op stub so the loop still completes.

## Getting started

Prerequisites: Node 20 or later, pnpm, and git.

```bash
git clone https://github.com/hoanghelm/UrAIWorkflow.git && cd UrAIWorkflow
pnpm install
pnpm --filter @vcc-workflow/schema build
cp apps/api/.env.example apps/api/.env
pnpm --filter @vcc-workflow/api prisma:generate
pnpm --filter @vcc-workflow/api prisma:migrate
pnpm dev
```

Built-in agents, skills, tools, MCPs, and the 12 template packs seed on API boot, so a clean checkout is populated the first time the API starts. The SQLite database (`apps/api/prisma/data/`) is git-ignored and stays on the machine; only migrations and code travel.

`apps/api/prisma/seed.ts` seeds no demo data. Register a workspace to scan its `.claude` files; the machine-wide `~/.claude` files load automatically as local-scope components.

| Service | URL |
| --- | --- |
| API | http://localhost:3001/api |
| Swagger | http://localhost:3001/api/docs |
| Web | http://localhost:5173 |

## Run with Docker

```bash
docker compose up --build
```

- Web on `5173`, API and Swagger on `3001/api/docs`.
- Built-ins and template packs seed on first boot; migrations apply automatically.
- The SQLite database and collected artifacts persist in named volumes (`vcc-db`, `vcc-artifacts`).
- Activate a model connector on the Connectors page to run agents. The API key stays in the local database, never in the image.

## Run hosted (PostgreSQL)

The same codebase runs two ways, chosen at boot by `DEPLOYMENT_MODE`:

| Mode | Storage | Auth |
| --- | --- | --- |
| `local` (default) | SQLite on disk | none |
| `hosted` | PostgreSQL | `Authorization: Bearer <HOSTED_ACCESS_TOKEN>` on every route except `/api/health` and `/api/docs` |

Three entry points:

```bash
pnpm start:local     # local app on SQLite (default, no setup)
pnpm server:dev      # server mode locally: starts a local Postgres, then runs the app
HOSTED_ACCESS_TOKEN=your-long-random-token pnpm server   # full hosted stack in Docker
```

- `pnpm server:dev` starts a local `postgres:16` (via `docker-compose.db.yml` on `localhost:5432`), applies the Postgres migrations, and runs the app in hosted mode with a `dev-token` (override with `HOSTED_ACCESS_TOKEN`). Requires Docker.
- `pnpm server` builds and runs the app and Postgres as containers (`docker-compose.hosted.yml`). The app waits for the database, migrates, then starts. It refuses to start without `HOSTED_ACCESS_TOKEN`.
- The database persists in the `vcc-pg` volume; the default database name is `vcc`.

Postgres uses a generated schema (`prisma/postgres/schema.prisma`) kept in sync with the SQLite schema. After changing `prisma/schema.prisma`, regenerate it and add a migration:

```bash
pnpm --filter @vcc-workflow/api gen:pg-schema
pnpm --filter @vcc-workflow/api exec prisma migrate dev --schema=prisma/postgres/schema.prisma --name <change>
```

Connector API keys are encrypted at rest in both modes (`VCC_ENCRYPTION_KEY`, or a generated local key file). Hosted mode is lightweight: one shared access token, no per-user tenants or managed model keys.

## Agent adapters

Agent execution sits behind `AgentPort`, implemented by `AgentRouter` (`runner/agent.router.ts`). Each run stage is routed to the adapter for the connector you activate, so the runner never depends on a single model provider. Provider adapters live next to it as `runner/agent.*.ts`. Add and activate a connector on the Connectors page; with none set, the runner uses a no-op stub so the loop still completes.
