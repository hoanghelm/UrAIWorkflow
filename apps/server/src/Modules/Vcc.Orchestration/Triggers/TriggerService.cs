using Microsoft.EntityFrameworkCore;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;
using Vcc.Orchestration.Runner;

namespace Vcc.Orchestration.Triggers;

public sealed record TriggerDto(string Id, string Name, string ProjectId, string Pack, int IntervalSec, bool Enabled, string? LastRunAt);
public sealed record CreateTriggerInput(string Name, string ProjectId, string Pack, int? IntervalSec, bool? Enabled);

public interface ITriggerService
{
    Task<IReadOnlyList<TriggerDto>> ListAsync(string? projectId, CancellationToken ct);
    Task<TriggerDto> CreateAsync(CreateTriggerInput input, CancellationToken ct);
    Task<string?> FireAsync(string id, CancellationToken ct);
    Task<TriggerDto?> SetEnabledAsync(string id, bool enabled, CancellationToken ct);
    Task<bool> DeleteAsync(string id, CancellationToken ct);
}

public sealed class TriggerService(IBoardDbContext board, IProjectDbContext projects, IRunnerService runner) : ITriggerService
{
    private static TriggerDto ToDto(Trigger t) => new(t.Id, t.Name, t.ProjectId, t.Pack, t.IntervalSec, t.Enabled, t.LastRunAt?.ToString("O"));

    public async Task<IReadOnlyList<TriggerDto>> ListAsync(string? projectId, CancellationToken ct)
    {
        var items = await board.Triggers.Where(t => projectId == null || t.ProjectId == projectId)
            .OrderByDescending(t => t.CreatedAt).ToListAsync(ct);
        return items.Select(ToDto).ToList();
    }

    public async Task<TriggerDto> CreateAsync(CreateTriggerInput input, CancellationToken ct)
    {
        var trigger = new Trigger
        {
            Name = input.Name,
            ProjectId = input.ProjectId,
            Pack = input.Pack,
            Type = "schedule",
            IntervalSec = input.IntervalSec ?? 3600,
            Enabled = input.Enabled ?? true,
        };
        board.Triggers.Add(trigger);
        await board.SaveChangesAsync(ct);
        return ToDto(trigger);
    }

    public async Task<string?> FireAsync(string id, CancellationToken ct)
    {
        var trigger = await board.Triggers.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (trigger is null) return null;
        var project = await projects.Projects.FirstOrDefaultAsync(p => p.Id == trigger.ProjectId, ct);
        var request = new RunRequest(trigger.ProjectId, "", trigger.Name, trigger.Name, trigger.Pack, "sonnet", project?.Root ?? "", null, "{}", "trigger");
        var runId = await runner.StartRunAsync(request, ct);
        trigger.LastRunAt = DateTime.UtcNow;
        await board.SaveChangesAsync(ct);
        return runId;
    }

    public async Task<TriggerDto?> SetEnabledAsync(string id, bool enabled, CancellationToken ct)
    {
        var trigger = await board.Triggers.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (trigger is null) return null;
        trigger.Enabled = enabled;
        await board.SaveChangesAsync(ct);
        return ToDto(trigger);
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken ct)
    {
        var trigger = await board.Triggers.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (trigger is null) return false;
        board.Triggers.Remove(trigger);
        await board.SaveChangesAsync(ct);
        return true;
    }
}
