using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Orchestration.Events;

public interface IRunEventLog
{
    Task EmitAsync(string runId, string level, string? stageId, string? status, string? breach, string message, CancellationToken ct);
    Task EmitStageAsync(string runId, string stageId, string stageStatus, CancellationToken ct);
    Task DeltaAsync(string runId, string stageId, string line, CancellationToken ct);
    Task TraceAsync(string runId, string stageId, string text, CancellationToken ct);
    Task BoardChangedAsync(string projectId, CancellationToken ct);
}

public sealed class RunEventLog(IRunDbContext db, IRunNotifier notifier) : IRunEventLog
{
    public async Task EmitAsync(string runId, string level, string? stageId, string? status, string? breach, string message, CancellationToken ct)
    {
        db.RunEvents.Add(new RunEvent { RunId = runId, Level = level, StageId = stageId, Status = status, Breach = breach, Message = message });
        await db.SaveChangesAsync(ct);
        await notifier.RunEventAsync(runId, new { status, stageId, level, message, breach }, ct);
    }

    public async Task EmitStageAsync(string runId, string stageId, string stageStatus, CancellationToken ct)
    {
        db.RunEvents.Add(new RunEvent { RunId = runId, Level = "info", StageId = stageId, StageStatus = stageStatus, Message = $"{stageId} {stageStatus}" });
        await db.SaveChangesAsync(ct);
        await notifier.RunEventAsync(runId, new { stageId, stageStatus }, ct);
    }

    public Task DeltaAsync(string runId, string stageId, string line, CancellationToken ct)
        => notifier.RunDeltaAsync(runId, stageId, line, ct);

    public Task TraceAsync(string runId, string stageId, string text, CancellationToken ct)
        => notifier.RunTraceAsync(runId, stageId, text, ct);

    public Task BoardChangedAsync(string projectId, CancellationToken ct)
        => notifier.BoardChangedAsync(projectId, ct);
}
