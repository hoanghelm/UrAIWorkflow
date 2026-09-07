using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Vcc.Infrastructure.Persistence.Abstractions;
using Vcc.Orchestration.Engine;
using Vcc.Orchestration.State;

namespace Vcc.Orchestration.Background;

public sealed class RunQueueWorker(
    IServiceScopeFactory scopeFactory,
    IRunControl control,
    IRunQueue queue,
    IConfiguration config,
    ILogger<RunQueueWorker> logger) : BackgroundService
{
    private readonly HashSet<string> _inFlight = new();
    private readonly object _lock = new();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var pollMs = int.TryParse(config["RUN_QUEUE_POLL_MS"], out var p) ? p : 5_000;
        var concurrency = int.TryParse(config["RUN_QUEUE_CONCURRENCY"], out var c) && c > 0 ? c : 4;
        var maxAttempts = int.TryParse(config["OUTBOX_MAX_ATTEMPTS"], out var m) && m > 0 ? m : 5;
        var backoffMs = int.TryParse(config["OUTBOX_BACKOFF_MS"], out var b) ? b : 10_000;
        using var gate = new SemaphoreSlim(concurrency, concurrency);

        while (!stoppingToken.IsCancellationRequested)
        {
            try { await DrainAsync(gate, maxAttempts, backoffMs, stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { logger.LogError(ex, "run queue drain failed"); }
            await queue.WaitAsync(TimeSpan.FromMilliseconds(pollMs), stoppingToken);
        }
    }

    private async Task DrainAsync(SemaphoreSlim gate, int maxAttempts, int backoffMs, CancellationToken stoppingToken)
    {
        List<(string Id, string RunId)> batch;
        List<string> skip;
        lock (_lock) skip = _inFlight.ToList();

        using (var scope = scopeFactory.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<IRunDbContext>();
            var now = DateTime.UtcNow;
            var rows = await db.OutboxMessages
                .Where(o => o.ProcessedAt == null && o.NotBefore <= now && !skip.Contains(o.Id))
                .OrderBy(o => o.CreatedAt)
                .Select(o => new { o.Id, o.RunId })
                .Take(100)
                .ToListAsync(stoppingToken);
            batch = rows.Select(r => (r.Id, r.RunId)).ToList();
        }

        foreach (var (id, runId) in batch)
        {
            lock (_lock) { if (!_inFlight.Add(id)) continue; }
            await gate.WaitAsync(stoppingToken);
            _ = Task.Run(() => ProcessAsync(id, runId, gate, maxAttempts, backoffMs, stoppingToken), CancellationToken.None);
        }
    }

    private async Task ProcessAsync(string id, string runId, SemaphoreSlim gate, int maxAttempts, int backoffMs, CancellationToken stoppingToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var engine = scope.ServiceProvider.GetRequiredService<IWorkflowEngine>();
            if (!control.IsActive(runId)) await engine.RunAsync(runId);
            await CompleteAsync(id, null, maxAttempts, backoffMs);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "outbox {Id} (run {RunId}) failed", id, runId);
            try { await CompleteAsync(id, ex.Message, maxAttempts, backoffMs); } catch { }
        }
        finally
        {
            gate.Release();
            lock (_lock) _inFlight.Remove(id);
        }
    }

    private async Task CompleteAsync(string id, string? error, int maxAttempts, int backoffMs)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IRunDbContext>();
        var row = await db.OutboxMessages.FirstOrDefaultAsync(o => o.Id == id);
        if (row is null) return;

        if (error is null)
        {
            row.ProcessedAt = DateTime.UtcNow;
        }
        else
        {
            row.Attempts++;
            row.Error = error;
            if (row.Attempts >= maxAttempts) row.ProcessedAt = DateTime.UtcNow;
            else row.NotBefore = DateTime.UtcNow.AddMilliseconds((double)backoffMs * row.Attempts);
        }
        await db.SaveChangesAsync();
    }
}
