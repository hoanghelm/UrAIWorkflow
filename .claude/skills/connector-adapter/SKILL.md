---
name: connector-adapter
description: Add a model-provider SDK connector to the .NET backend (Vcc.Connectors). TRIGGER when wiring a new AI provider/adapter (e.g. Anthropic API, Claude subscription, Copilot, Vertex, Bedrock) behind IAgentConnector. SKIP for changing the runner loop (Vcc.Orchestration) or terminal sessions (Vcc.Terminal).
---

`Vcc.Connectors` abstracts model access behind `IAgentConnector` (defined in `Vcc.Shared`). The runner
never depends on a concrete provider — `ConnectorRouter` picks the adapter for the active connector.

## Steps

1. Confirm the port in `Vcc.Shared/Application/Interfaces/IAgentConnector.cs`:
   ```csharp
   public interface IAgentConnector
   {
       string Provider { get; }                       // "claude-agent" | "claude" | "copilot" | ...
       Task<StageResult> RunStageAsync(StageRequest request, ConnectorContext ctx, CancellationToken ct);
   }
   ```
   `StageRequest` / `StageResult` / `ConnectorContext` live in `Vcc.Shared` (model tier, prompt, cwd,
   token usage back-channel). Extend them there if the new provider needs more.

2. Add the adapter `Vcc.Connectors/Adapters/<Provider>Connector.cs` (sealed, implements `IAgentConnector`).
   - Talk to the provider SDK/HTTP client; stream output.
   - Run any local process (a CLI login, `claude`, `copilot`) through `ITerminalSessionManager` — never
     `Process.Start` here.
   - Resolve the model tier through `IServerPolicy` (allowed models) before calling.
   - Report token usage back via the `ConnectorContext` so `Vcc.Metrics` records it.

3. Register it in `Vcc.Connectors/DependencyInjection.cs`:
   `services.AddScoped<IAgentConnector, <Provider>Connector>();`

4. `ConnectorRouter` selects by the active connector's `Provider`; a no-op stub is the fallback when no
   connector is set. Add the new `Provider` string to the policy's allowed-providers list.

5. Credentials come from `ConnectorStore` (encrypted via `ICredentialCipher`). Never read keys from the
   process env in the adapter.

6. `dotnet build` green; a run using the new connector streams deltas and records tokens.

## Rules
Read `.claude/rules/backend-dotnet.md`. The adapter depends only on `Vcc.Shared` ports (`ITerminalSessionManager`,
`IServerPolicy`, `IMetricsRecorder`) — not on Orchestration or other feature modules.
