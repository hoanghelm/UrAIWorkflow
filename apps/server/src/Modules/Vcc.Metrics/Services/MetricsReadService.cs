using Microsoft.EntityFrameworkCore;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;
using Vcc.Metrics.Contracts;

namespace Vcc.Metrics.Services;

public sealed class MetricsReadService(IMetricsDbContext metrics, IRunDbContext runs) : IMetricsReadService
{
    private const string AgentBlockKind = "agent";

    public async Task<LedgerSummaryDto> LedgerRunAsync(string runId, CancellationToken ct)
    {
        var run = await runs.Runs.FirstOrDefaultAsync(r => r.Id == runId, ct);
        var entries = await metrics.LedgerEntries.Where(l => l.RunId == runId).ToListAsync(ct);
        var byLever = entries.GroupBy(l => l.Lever).ToDictionary(g => g.Key, g => g.Sum(l => l.Saved));
        return new LedgerSummaryDto(runId, null,
            run?.TokensConsumed ?? 0, run?.TokensSaved ?? entries.Sum(l => l.Saved),
            run?.TokensInput ?? 0, run?.TokensOutput ?? 0, run?.TokensCached ?? 0, byLever);
    }

    public async Task<LedgerSummaryDto> LedgerProjectAsync(string projectId, CancellationToken ct)
    {
        var projectRuns = await runs.Runs.Where(r => r.ProjectId == projectId).ToListAsync(ct);
        var ids = projectRuns.Select(r => r.Id).ToList();
        var entries = await metrics.LedgerEntries.Where(l => ids.Contains(l.RunId)).ToListAsync(ct);
        var byLever = entries.GroupBy(l => l.Lever).ToDictionary(g => g.Key, g => g.Sum(l => l.Saved));
        return new LedgerSummaryDto(null, projectId,
            projectRuns.Sum(r => r.TokensConsumed), projectRuns.Sum(r => r.TokensSaved),
            projectRuns.Sum(r => r.TokensInput), projectRuns.Sum(r => r.TokensOutput),
            projectRuns.Sum(r => r.TokensCached), byLever);
    }

    public async Task<IReadOnlyList<UsageStatDto>> StatsAsync(string projectId, CancellationToken ct)
    {
        var stats = await metrics.UsageStats.Where(s => s.ProjectId == projectId)
            .OrderByDescending(s => s.Invocations).ToListAsync(ct);
        return stats.Select(s => new UsageStatDto(s.BlockKind, s.BlockName, s.Invocations, s.LastUsedAt.ToString("O"))).ToList();
    }

    public async Task<BackfillResult> BackfillAsync(string projectId, CancellationToken ct)
    {
        var projectRuns = await runs.Runs.Where(r => r.ProjectId == projectId).ToListAsync(ct);
        var ids = projectRuns.Select(r => r.Id).ToList();
        var stages = await runs.Stages.Where(s => ids.Contains(s.RunId)).ToListAsync(ct);

        var grouped = stages.GroupBy(s => s.Agent).Select(g => new { Name = g.Key, Count = g.Count() }).ToList();
        var existing = await metrics.UsageStats.Where(s => s.ProjectId == projectId).ToListAsync(ct);
        foreach (var g in grouped)
        {
            var stat = existing.FirstOrDefault(s => s.BlockKind == AgentBlockKind && s.BlockName == g.Name);
            if (stat is null)
                metrics.UsageStats.Add(new UsageStat { ProjectId = projectId, BlockKind = AgentBlockKind, BlockName = g.Name, Invocations = g.Count, LastUsedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
            else { stat.Invocations = g.Count; stat.LastUsedAt = DateTime.UtcNow; stat.UpdatedAt = DateTime.UtcNow; }
        }
        await metrics.SaveChangesAsync(ct);
        return new BackfillResult(projectRuns.Count, grouped.Count);
    }
}
