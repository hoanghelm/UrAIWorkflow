using Vcc.Metrics.Contracts;

namespace Vcc.Metrics.Services;

public interface IMetricsReadService
{
    Task<LedgerSummaryDto> LedgerRunAsync(string runId, CancellationToken ct);
    Task<LedgerSummaryDto> LedgerProjectAsync(string projectId, CancellationToken ct);
    Task<IReadOnlyList<UsageStatDto>> StatsAsync(string projectId, CancellationToken ct);
    Task<BackfillResult> BackfillAsync(string projectId, CancellationToken ct);
}
