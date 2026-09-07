namespace Vcc.Shared.Application.Interfaces;

public sealed record StageRequest(string RunId, string StageId, string ProjectId, string Model, IReadOnlyList<string> System, string Prompt, string Cwd);

public sealed record StageResult(bool Passed, string Output, int InputTokens, int OutputTokens, int CachedTokens = 0);

public sealed record ConnectorContext(string Provider, string? ApiKey, string? BaseUrl, IReadOnlyDictionary<string, string> Models);

public interface IAgentConnector
{
    string Provider { get; }
    Task<StageResult> RunStageAsync(StageRequest request, ConnectorContext context, Func<string, Task> onDelta, CancellationToken ct);
}

public interface IConnectorRouter
{
    Task<StageResult> RunStageAsync(StageRequest request, Func<string, Task> onDelta, CancellationToken ct);
}
