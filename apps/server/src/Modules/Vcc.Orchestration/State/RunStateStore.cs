using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;
using Vcc.Orchestration.Workflow;

namespace Vcc.Orchestration.State;

public interface IRunStateStore
{
    Task<ExecutionState?> LoadAsync(string runId, CancellationToken ct);
    Task SaveAsync(string runId, ExecutionState state, CancellationToken ct);
}

public sealed class RunStateStore(IRunDbContext db) : IRunStateStore
{
    private const string StateStage = "__state__";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task<ExecutionState?> LoadAsync(string runId, CancellationToken ct)
    {
        var cp = await db.Checkpoints.Where(c => c.RunId == runId && c.StageId == StateStage)
            .OrderByDescending(c => c.CreatedAt).FirstOrDefaultAsync(ct);
        if (cp is null) return null;
        try { return JsonSerializer.Deserialize<ExecutionState>(cp.State, Json); }
        catch { return null; }
    }

    public async Task SaveAsync(string runId, ExecutionState state, CancellationToken ct)
    {
        var cp = await db.Checkpoints.FirstOrDefaultAsync(c => c.RunId == runId && c.StageId == StateStage, ct);
        var payload = JsonSerializer.Serialize(state, Json);
        if (cp is null) db.Checkpoints.Add(new Checkpoint { RunId = runId, StageId = StateStage, State = payload });
        else { cp.State = payload; cp.CreatedAt = DateTime.UtcNow; }
        await db.SaveChangesAsync(ct);
    }
}
