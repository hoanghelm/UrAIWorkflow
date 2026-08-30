using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;
using Vcc.Orchestration.Engine;
using Vcc.Orchestration.State;
using Vcc.Orchestration.Workflow;

namespace Vcc.Orchestration.Runner;

public sealed record RunRequest(
    string ProjectId, string CardId, string Name, string Requirement, string Pack, string Model,
    string ProjectRoot, string? Cwd = null, string Workflow = "{}", string Kind = "pipeline");

public interface IRunnerService
{
    Task<string> StartRunAsync(RunRequest request, CancellationToken ct);
    Task ResumeRunAsync(string runId, string answer, CancellationToken ct);
    Task RerunFromAsync(string runId, string stageId, CancellationToken ct);
}

public sealed class RunnerService(IServiceScopeFactory scopeFactory, IRunControl control) : IRunnerService
{
    public async Task<string> StartRunAsync(RunRequest request, CancellationToken ct)
    {
        var runId = Guid.NewGuid().ToString("n");
        using (var scope = scopeFactory.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<IRunDbContext>();
            var stateStore = scope.ServiceProvider.GetRequiredService<IRunStateStore>();
            db.Runs.Add(new Run
            {
                Id = runId,
                ProjectId = request.ProjectId,
                CardId = string.IsNullOrEmpty(request.CardId) ? null : request.CardId,
                Name = request.Name,
                Pack = request.Pack,
                Kind = request.Kind,
                Status = "pending",
                Cwd = request.Cwd,
                Workflow = request.Workflow,
            });
            await db.SaveChangesAsync(ct);
            var state = new ExecutionState(request.Requirement, string.IsNullOrEmpty(request.Model) ? "sonnet" : request.Model,
                request.ProjectRoot, 0, "", [], 0);
            await stateStore.SaveAsync(runId, state, ct);
        }

        Launch(runId);
        return runId;
    }

    public async Task ResumeRunAsync(string runId, string answer, CancellationToken ct)
    {
        if (control.IsActive(runId)) return;
        using (var scope = scopeFactory.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<IRunDbContext>();
            var stateStore = scope.ServiceProvider.GetRequiredService<IRunStateStore>();
            var run = await db.Runs.FirstOrDefaultAsync(r => r.Id == runId, ct);
            var state = await stateStore.LoadAsync(runId, ct);
            if (run is null || state is null) return;
            if (run.Status is not ("waiting" or "failed" or "stopped")) return;
            if (!state.ApprovedGates.Contains(state.StageIndex)) state.ApprovedGates.Add(state.StageIndex);
            var answers = state.Answers ?? [];
            if (!string.IsNullOrWhiteSpace(answer)) answers.Add(answer);
            state = state with { Answers = answers, LoopCount = 0 };
            run.Status = "running"; run.Question = null; run.Breach = null;
            await stateStore.SaveAsync(runId, state, ct);
            await db.SaveChangesAsync(ct);
        }
        Launch(runId);
    }

    public async Task RerunFromAsync(string runId, string stageId, CancellationToken ct)
    {
        if (control.IsActive(runId)) return;
        using (var scope = scopeFactory.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<IRunDbContext>();
            var stateStore = scope.ServiceProvider.GetRequiredService<IRunStateStore>();
            var run = await db.Runs.FirstOrDefaultAsync(r => r.Id == runId, ct);
            var state = await stateStore.LoadAsync(runId, ct);
            if (run is null || state is null) return;
            var row = await db.Stages.FirstOrDefaultAsync(s => s.RunId == runId && s.StageId == stageId, ct);
            var idx = row?.Order ?? state.StageIndex;
            state.ApprovedGates.RemoveAll(x => x >= idx);
            run.Status = "running"; run.Question = null; run.Breach = null;
            await stateStore.SaveAsync(runId, state with { StageIndex = idx }, ct);
            await db.SaveChangesAsync(ct);
        }
        Launch(runId);
    }

    private void Launch(string runId)
    {
        _ = Task.Run(async () =>
        {
            using var scope = scopeFactory.CreateScope();
            var engine = scope.ServiceProvider.GetRequiredService<IWorkflowEngine>();
            await engine.RunAsync(runId);
        }, CancellationToken.None);
    }
}
