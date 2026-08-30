# VCC-Workflow — .NET 8/9 Backend Architecture (proposal for review)

Re-platform the backend from NestJS to **.NET 9**, modeled on the KOS/KDV solution: strong
module-per-project separation with clear boundaries. Two deliberate differences from KOS:

- **No CQRS / MediatR.** Each feature is `Endpoint → Service → Persistence`. Plain service classes,
  constructor-injected, registered per module. No command/query handlers, no pipeline behaviors.
- **SQLite via EF Core**, single local user (no multi-tenant schema routing). Local-first stays.

The React web app (`apps/web`) is unchanged; it talks to the .NET API over HTTP + **SignalR**
(replacing socket.io). Contracts move from zod to C# DTOs exposed via OpenAPI.

---

## Solution layout

```
apps/server/                              (.NET solution root; NestJS apps/api retired after cutover)
├── Directory.Build.props                 net9.0, Nullable, ImplicitUsings, LangVersion latest
├── Vcc.sln
├── src/
│   ├── Modules/
│   │   ├── Vcc.Shared/                   base types, Result<T>, cross-module service interfaces,
│   │   │                                 guardrail contracts, enums (RunStatus, DeploymentMode). No domain refs.
│   │   ├── Vcc.Domain/                   entities + value objects + domain events (plain classes)
│   │   ├── Vcc.Infrastructure/           EF Core VccDbContext (SQLite), entity configs, repositories,
│   │   │                                 UnitOfWork, EF migrations, credential encryption
│   │   │
│   │   ├── Vcc.Connectors/               SDK Connectors: IAgentConnector + adapters + router + policy
│   │   ├── Vcc.Terminal/                 Terminal Sessions: process/PTY sessions, worktrees, streaming
│   │   ├── Vcc.Orchestration/            Runner engine: plan/act/verify/decide loop + guardrails + packs
│   │   ├── Vcc.Packages/                 Catalog scan + bundles(zip) install + plugin fetch + marketplace
│   │   ├── Vcc.Metrics/                  Token ledger, per-lever attribution, run/project usage summaries
│   │   ├── Vcc.Notification/             SignalR hubs + in-memory live-state store ("memory db")
│   │   ├── Vcc.Projects/                 Projects/workspaces registry + persona
│   │   ├── Vcc.Board/                    Board: cards, columns, sprints, triggers, automation
│   │   ├── Vcc.Design/                   Designs: artifacts, versions, generate, diagrams
│   │   ├── Vcc.Test/                     Tests: test artifacts + generation
│   │   └── Vcc.Api/                      Endpoints host — Minimal API groups, auth, CORS, SignalR, DI root
│   │
│   └── Worker/Vcc.Worker/                (optional) hosted services for long-running runs
│
├── monitors/                            Aspire (day one)
│   ├── Vcc.AppHost/                      local orchestration (Vcc.Api + Vcc.ServiceDefaults)
│   └── Vcc.ServiceDefaults/              OTEL traces + metrics + health checks + resilience
│
└── tests/
    ├── Vcc.Domain.Tests/                 pure domain, no mocks
    ├── Vcc.Modules.Tests/                service tests, mocked interfaces
    └── Vcc.Integration.Tests/           HTTP + EF end-to-end (SQLite temp file)
```

---

## Modules and responsibilities

| Module | Owns | Key services |
|---|---|---|
| **Vcc.Shared** | Contracts shared across modules; nothing depends downward on domain | `IAgentConnector`, `ITerminalSessionManager`, `IMetricsRecorder`, `IRunNotifier`, `IPackageInstaller`, `IWorkspaceContext`, `Result<T>`, guardrail records, enums |
| **Vcc.Domain** | Entities + domain events | `Project`, `BoardCard`, `Run`, `Stage`, `Checkpoint`, `Design`, `DesignArtifact`, `DesignVersion`, `Bundle`, `Connector`, `LedgerEntry`, `UsageStat`, `Pack`, `Trigger`, `Sprint` |
| **Vcc.Infrastructure** | Persistence | `VccDbContext` (implements per-module `I*DbContext`), EF configs, `Repository<T>`, `IUnitOfWork`, migrations, `ICredentialCipher` |
| **Vcc.Connectors** | Model provider access ("SDK Connectors") | `IAgentConnector` adapters (Claude subscription, Anthropic API, Copilot, +Vertex/Bedrock), `ConnectorRouter` (picks active), `ConnectorStore`, `IServerPolicy` (allowed models/providers, connectors locked) |
| **Vcc.Terminal** | Terminal/process sessions for AI SDK + runners | `ITerminalSessionManager` (start/stream/write/kill), `ProcessSession` (PTY/stdio), `IWorktreeService` (git worktrees under WORKSPACES_ROOT), session registry (in-memory) |
| **Vcc.Orchestration** | The Runner | `RunnerService` (plan → act → verify → decide), `GuardrailEnforcer` (maxRetries, maxLoopDepth, budget, stageTimeout, onBreach), `WorkflowBuilder` (pack → workflow), `PackRegistry`, `CheckpointService` |
| **Vcc.Packages** | Skills/agents/tools/mcp packages | `CatalogScanner` (.claude + ~/.claude discovery, plugin subfolders), `BundleStore` (zip index + seed), `PluginFetcher` (GitHub plugin detection), `MarketplaceService`, `PackageInstaller` (extract to workspace `.claude`) |
| **Vcc.Metrics** | Metrics management | `LedgerService` (per-lever token attribution), `UsageStatsService`, run + project summaries |
| **Vcc.Notification** | Realtime | `RunsHub` (SignalR `/runs`), `IRunNotifier` (persist-first-then-emit), `LiveStateStore` (in-memory `ConcurrentDictionary` = the "memory db" of active runs/tasks), board + run + delta + trace events |
| **Vcc.Projects** | Workspaces | `ProjectService` (register/clone/list, persona), workspace roots |
| **Vcc.Board** | Board | `BoardService` (cards, columns, sprints, triggers, automation), send-to-board → Orchestration |
| **Vcc.Design** | Designs | `DesignService` (artifacts, versions, generate), diagrams |
| **Vcc.Test** | Tests | `TestService` (test artifacts + generation) |
| **Vcc.Api** | HTTP surface | `*Endpoints.cs` per feature, `HostedAuthGuard` (bearer in hosted), CORS (`WEB_ORIGIN`), SignalR mapping, Swagger/OpenAPI, DI composition |

---

## Dependency direction

```
Vcc.Shared            (interfaces + base types; no downward deps)
   ↑
Vcc.Domain            (entities + events)
   ↑
Vcc.Infrastructure    (EF Core SQLite; implements per-module DbContext interfaces)
   ↑
Vcc.Connectors   Vcc.Terminal   Vcc.Metrics   Vcc.Notification   Vcc.Packages
   (each implements its Vcc.Shared interfaces; depends on Shared + Domain + Infrastructure)
   ↑
Vcc.Orchestration     (depends on the Shared interfaces above — never on concrete adapters)
   ↑
Vcc.Workspace         (Board/Design/Test services; call Orchestration to start runs)
   ↑
Vcc.Api               (references every module for DI; maps endpoints + SignalR)
```

Cross-module calls go through **interfaces defined in `Vcc.Shared`**, implemented by the owning
module (the KOS "port/adapter" idea, minus MediatR). `Vcc.Orchestration` depends on
`IAgentConnector`, `ITerminalSessionManager`, `IMetricsRecorder`, `IRunNotifier` — not on the
concrete `Vcc.Connectors`/`Vcc.Terminal` types. This keeps the runner testable and the boundaries hard.

---

## The no-CQRS pattern (per feature)

```
Endpoint (Vcc.Api/Endpoints/BoardEndpoints.cs)   thin: validate input, call service, shape response
    → Service (Vcc.Workspace/Board/BoardService)  business logic, guardrails, domain events
        → Repository / DbContext (Vcc.Infrastructure)  data access, UnitOfWork.SaveChanges
```

- **Endpoints** are Minimal API groups (`app.MapGroup("/api/board")...`), one `*Endpoints.cs` per feature.
- **Services** are plain classes behind an interface, registered in the module's `DependencyInjection.cs`.
- **Validation** via FluentValidation called inside the service (or an endpoint filter) — no MediatR pipeline.
- **Domain events** are raised on aggregates and dispatched after `SaveChanges` by an EF interceptor
  (feeds `Vcc.Notification` for realtime), replacing the socket.io "persist then emit".

---

## Persistence — split DbContext interfaces, single implementation (SQLite)

Mirrors KOS, without tenancy. Each module's persistence needs are expressed as an interface it owns;
`VccDbContext` implements all of them.

```csharp
public interface IBoardDbContext   { DbSet<BoardCard> BoardCards { get; } DbSet<Sprint> Sprints { get; } }
public interface IRunDbContext     { DbSet<Run> Runs { get; } DbSet<Stage> Stages { get; } }
public interface IPackageDbContext { DbSet<Bundle> Bundles { get; } DbSet<CatalogItem> CatalogItems { get; } }

public sealed class VccDbContext : DbContext, IBoardDbContext, IRunDbContext, IPackageDbContext, /* ... */ { }
```

- **SQLite** file under `data/vcc.db` (local) — `WORKSPACES_ROOT`, artifacts, git worktrees stay on disk.
- **Connector keys encrypted at rest** via `ICredentialCipher` (AES-256, key from config), replacing the Prisma-side encryption.
- Hosted mode: swap the SQLite provider for **Npgsql (PostgreSQL)** behind the same DbContext, gated by `DEPLOYMENT_MODE` — one code path, two providers.

## Migrations — `Vcc.Migrations` (hand-written, SqlKata, KOS-style)

Not EF Core migrations. One `Vcc.Migrations` project owns the schema and seed data as versioned C#
classes, applied at startup by runners (idempotent, tracked in `__vcc_schema_migrations` /
`__vcc_data_migrations`). Two kinds, mirroring KOS:

- **Schema** (`ISchemaMigration`, `SM###_*`) — raw DDL, provider-specific, in `Schema/Sqlite` and
  `Schema/Postgres` subfolders (SQLite and Postgres SQL differ). The runner applies the set matching the
  active `DbProvider`.
- **Data** (`IDataMigration`, `DM###_*`) — seeds/backfills via **SqlKata** (`QueryFactory`), one class
  for both providers (the compiler emits the right dialect). In `Data/`.
- `MigrationOrchestrator` runs schema then data on boot. `MigrationConnectionFactory` opens the right
  `IDbConnection` (Sqlite/Npgsql) and SqlKata `Compiler` by provider.

EF Core is still the ORM for entity CRUD; `Vcc.Migrations` only owns schema + seed. This keeps DDL under
our control across both providers and gives a clean data-migration story separate from schema.

---

## Realtime — Notification with SignalR + in-memory "memory db"

- **`RunsHub : Hub`** at `/runs` replaces the socket.io namespace. Web subscribes with the same auth token.
- **`IRunNotifier`**: `RunEvent`, `RunDelta`, `RunTrace`, `RunStarted`, `BoardChanged` — persist first, then push to clients (KOS rule).
- **`LiveStateStore`** (the "memory db"): a `ConcurrentDictionary` of active runs / terminal sessions /
  task progress for O(1) realtime reads and fan-out, backed by SQLite for durability. Two-tab consistency
  (the bug we fixed) comes for free — new subscribers read current state from the store on connect.

---

## Terminal Sessions (the piece that's new and explicit)

`Vcc.Terminal` owns every OS process the runner spawns — the AI SDK/CLI, git, shell, build:

- **`ITerminalSessionManager`**: `Start(TerminalSpec)` → `sessionId`; `Stream(sessionId)` (stdout/stderr as
  `IAsyncEnumerable<string>`); `Write(sessionId, input)`; `Kill(sessionId)`.
- **`ProcessSession`** wraps `System.Diagnostics.Process` (or a PTY lib for interactive tools), with
  cancellation, timeouts, and buffered output for late subscribers.
- **`IWorktreeService`**: create/remove git worktrees under `WORKSPACES_ROOT`, sanitize ids (the `::`
  bug we fixed), `git init` when absent, collect diffs/artifacts.
- The **Orchestration** loop asks Terminal to run a connector's agent, streams deltas/traces out through
  `IRunNotifier`, and records tokens through `IMetricsRecorder`.

---

## Current NestJS module → .NET module mapping

| NestJS (`apps/api`) | .NET module | Notes |
|---|---|---|
| `catalog` | Vcc.Packages | `.claude`/`~/.claude` scan, plugin subfolders |
| `marketplace` + `bundles` | Vcc.Packages | Bundle table + zip store + install + plugin fetch |
| `packs` + `workflow` | Vcc.Orchestration | pack registry + workflow builder |
| `runner` (loop, guardrails) | Vcc.Orchestration | plan/act/verify/decide, guardrails |
| `runner.gateway` (socket.io) | Vcc.Notification | SignalR `RunsHub` |
| `connectors` + agent adapters | Vcc.Connectors | IAgentConnector + router + policy |
| `ledger` + `stats` | Vcc.Metrics | token attribution + usage |
| `board` + `triggers` | Vcc.Workspace (Board) | cards, sprints, automation |
| `design` + `diagrams` | Vcc.Workspace (Design) | artifacts, versions, generate |
| `tests` | Vcc.Workspace (Test) | test artifacts |
| `ai` (generators) | Vcc.Connectors / Orchestration | generation via active connector |
| `figma` | Vcc.Connectors (integration) | or a small Vcc.Integrations |
| `health` / `whoami` | Vcc.Api | endpoints + policy exposure |
| worktree/process exec | Vcc.Terminal | explicit sessions module |

Nothing is dropped; the runner's implicit process/worktree handling becomes the explicit **Vcc.Terminal** module you asked for.

---

## Contracts / the web app

- Today `packages/schema` (zod) is the shared source of truth. With a .NET backend, contracts become
  **C# DTOs** on the server, exposed via **OpenAPI**. The web app either keeps hand-written TS types in
  `apps/web/src/lib/api.ts` (as now) or generates a typed client from the OpenAPI doc.
- `apps/web` otherwise unchanged: axios base `/api`, SignalR client replaces socket.io in `ws.ts`.

---

## Migration approach (phased, low-risk)

1. **Scaffold** `apps/server` solution + modules + `Vcc.Shared`/`Domain`/`Infrastructure` with the EF
   model translated from the Prisma schema (SQLite). Green build, no behavior yet.
2. **Port read paths first** (projects, board, designs list) behind `/api` so the web works against .NET.
3. **Port Connectors + Terminal + Orchestration** — get one run working end to end with SignalR streaming.
4. **Port Packages** (catalog + marketplace + bundle install + plugin fetch).
5. **Port Metrics** (ledger + stats).
6. **Cutover**: point `apps/web` at the .NET API, retire `apps/api` (NestJS).

The web keeps running throughout; we switch endpoints module-by-module.

---

## `.claude` harness changes (to build after you approve this)

| Area | Change |
|---|---|
| `rules/backend.md` | Replace NestJS rules with **backend-dotnet.md**: module boundaries, `Endpoint → Service → Persistence`, no CQRS, EF Core SQLite, SignalR, DI per module |
| `skills/nestjs-module` | Replace with **`dotnet-module`** — scaffold a new `Vcc.*` module project + `DependencyInjection.cs` |
| `skills/prisma-model` | Replace with **`ef-model`** — add/change an EF entity + config + migration |
| new `skills/endpoint` | Scaffold a Minimal API `*Endpoints.cs` group wired to a service |
| new `skills/connector-adapter` | Scaffold a new `IAgentConnector` adapter in Vcc.Connectors |
| `agents/backend-engineer` | Retarget to .NET module/service/EF work |
| new `agents/infrastructure-expert` | EF configs, DbContext, repositories, migrations, interceptors |
| new `agents/code-reviewer` (backend) | Enforce module boundaries + no-CQRS + no cross-module DbContext leaks |
| `commands/new-module` | Point at the `dotnet-module` skill |
| new `commands/add-endpoint`, `add-entity`, `add-connector` | Scaffolds |

---

## Decisions (locked)

1. **Location & name** — solution at `apps/server/`, project prefix `Vcc.*`.
2. **Feature grouping** — Board / Design / Test are **separate projects** (`Vcc.Board`, `Vcc.Design`, `Vcc.Test`), plus `Vcc.Projects` for the workspace registry.
3. **Hosted DB** — **SQLite + Postgres dual-provider** behind one `VccDbContext`, chosen by `DEPLOYMENT_MODE` (SQLite local, Npgsql hosted).
4. **Aspire monitors** — included from **day one** (`Vcc.AppHost` + `Vcc.ServiceDefaults`, OTEL + health).
5. **Web contracts** — open (default: keep hand-written TS in `apps/web/src/lib/api.ts`; can add an OpenAPI-generated client later).
