namespace Vcc.Metrics.Contracts;

public sealed record LedgerSummaryDto(
    string? RunId, string? ProjectId, int TokensConsumed, int TokensSaved,
    int TokensInput, int TokensOutput, int TokensCached, IReadOnlyDictionary<string, int> ByLever);

public sealed record UsageStatDto(string BlockKind, string BlockName, int Invocations, string LastUsedAt);

public sealed record BackfillResult(int Runs, int Blocks);
