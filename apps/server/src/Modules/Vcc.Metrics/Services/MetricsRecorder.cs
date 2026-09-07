using Microsoft.EntityFrameworkCore;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Metrics.Services;

public sealed class MetricsRecorder(IMetricsDbContext metrics, IRunDbContext runs) : IMetricsRecorder
{
    public async Task RecordAsync(string runId, string lever, int inputTokens, int outputTokens, int cachedTokens, CancellationToken ct)
    {
        var total = inputTokens + outputTokens;
        var saved = (int)Math.Round(cachedTokens * 0.9);

        metrics.LedgerEntries.Add(new LedgerEntry
        {
            RunId = runId,
            StageId = lever,
            Lever = lever,
            TokensBefore = cachedTokens,
            TokensAfter = total,
            Saved = saved,
        });
        await metrics.SaveChangesAsync(ct);

        await runs.Runs.Where(r => r.Id == runId).ExecuteUpdateAsync(s => s
            .SetProperty(r => r.TokensInput, r => r.TokensInput + inputTokens)
            .SetProperty(r => r.TokensOutput, r => r.TokensOutput + outputTokens)
            .SetProperty(r => r.TokensConsumed, r => r.TokensConsumed + total)
            .SetProperty(r => r.TokensCached, r => r.TokensCached + cachedTokens)
            .SetProperty(r => r.TokensSaved, r => r.TokensSaved + saved), ct);
    }
}
