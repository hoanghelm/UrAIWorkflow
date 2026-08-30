# Backend rules (apps/server — .NET 9)

The backend is a .NET 9 solution at `apps/server` (`Vcc.sln`), module-per-project under `src/Modules/*`.
See `docs/backend-dotnet-architecture.md` for the full map. During migration the NestJS `apps/api`
still runs; new backend work goes in `apps/server`.

## Non-negotiables

- **Module per project.** Each capability is its own `Vcc.*` project with a `DependencyInjection.cs`
  exposing `AddXxxModule(this IServiceCollection)`. `Vcc.Api` composes them.
- **No CQRS / MediatR.** The pattern is `Endpoint → Service → Persistence`. Endpoints are thin Minimal
  API groups; services hold business logic behind an interface; persistence is EF Core.
- **Cross-module calls go through interfaces in `Vcc.Shared`.** A module never references another
  feature module's concrete types or its `DbContext` interface. `Vcc.Orchestration` depends on
  `IAgentConnector` / `ITerminalSessionManager` / `IMetricsRecorder` / `IRunNotifier`, not on
  `Vcc.Connectors` / `Vcc.Terminal` concretes.
- **Dependency direction is one-way:** Shared ← Domain ← Infrastructure ← feature modules ← Api.
  Never add a reference that points back up.
- **EF Core is the only data access.** Split `I*DbContext` interfaces per module; one `VccDbContext`
  in `Vcc.Infrastructure` implements them all. SQLite local, Npgsql hosted — same context, provider
  chosen by `DEPLOYMENT_MODE`.
- **Realtime through `Vcc.Notification`.** Persist first, then emit via `IRunNotifier` (SignalR
  `RunsHub` at `/runs`). The in-memory `LiveStateStore` holds active run/session state.
- **Terminal work through `Vcc.Terminal`.** Any spawned process (AI SDK, git, shell, build) and every
  git worktree goes through `ITerminalSessionManager` / `IWorktreeService`. No `Process.Start` elsewhere.
- **No code comments.** Names and types carry meaning. XML doc-comments only on public library surface.

## Conventions

- `net9.0`, `Nullable` + `ImplicitUsings` enabled (from `Directory.Build.props`). `LangVersion latest`.
- Files: one public type per file, file-scoped namespaces, `sealed` by default.
- Services registered `Scoped`; hubs/`LiveStateStore` `Singleton`; DbContext `Scoped`.
- Validate input with FluentValidation inside the service or an endpoint filter — not a pipeline behavior.
- Domain events raised on aggregates, dispatched after `SaveChanges` by an EF interceptor.
- Connector credentials encrypted at rest via `ICredentialCipher` (AES-256).
- Tests: xUnit. Domain tests use no mocks; module tests mock the `Vcc.Shared` interfaces; integration
  tests run against a temp SQLite file.

## Skills / agents

- Scaffold a module: skill `dotnet-module`. Add an entity + migration: skill `ef-model`. Add an endpoint
  group: skill `dotnet-endpoint`. Add a connector: skill `connector-adapter`.
- Delegate implementation to agent `backend-dotnet-engineer`; EF/DbContext/migrations to `infrastructure-expert`.
