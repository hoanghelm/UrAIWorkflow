using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;
using Vcc.Orchestration.Context;
using Vcc.Orchestration.Telemetry;
using Vcc.Shared.Application.Interfaces;
using Vcc.Orchestration.Workflow;
using Vcc.Orchestration.Stages;
using Vcc.Orchestration.State;
using Vcc.Orchestration.Events;

namespace Vcc.Orchestration.Engine;

public interface IWorkflowEngine
{
    Task RunAsync(string runId);
}

public sealed class WorkflowEngine(
    IRunDbContext db,
    IPackageDbContext packages,
    IWorktreeService worktrees,
    IStageExecutor executor,
    IPromptComposer composer,
    IRunStateStore stateStore,
    IRunEventLog events,
    IRunControl control,
    IServiceScopeFactory scopeFactory,
    ILogger<WorkflowEngine> logger) : IWorkflowEngine
{
    public async Task RunAsync(string runId)
    {
        var run = await db.Runs.FirstOrDefaultAsync(r => r.Id == runId);
        if (run is null) return;
        var state = await stateStore.LoadAsync(runId, CancellationToken.None) ?? new ExecutionState("", "sonnet", "", 0, "", [], 0);

        var cts = control.Register(runId);
        var runCt = cts.Token;

        using var runSpan = OrchestrationTelemetry.Activity.StartActivity("workflow.run");
        runSpan?.SetTag("run.id", runId);
        runSpan?.SetTag("run.pack", run.Pack);
        OrchestrationTelemetry.RunsStarted.Add(1);

        try
        {
            var packManifest = await LatestPackManifestAsync(run.Pack);
            var workflow = WorkflowParser.Resolve(run.Workflow, packManifest, string.IsNullOrEmpty(run.Name) ? run.Pack : run.Name);
            var g = workflow.Guardrails;

            string cwd;
            if (!string.IsNullOrEmpty(run.Cwd)) cwd = run.Cwd!;
            else { var worktree = await worktrees.CreateAsync(state.ProjectRoot, runId, runCt); cwd = worktree.Path; }
            run.Cwd = cwd;
            run.Status = "running";
            run.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(runCt);
            await events.EmitAsync(runId, "info", null, "running", null, state.StageIndex == 0 ? "run started" : "run resumed", runCt);

            for (var i = state.StageIndex; i < workflow.Stages.Count; i++)
            {
                runCt.ThrowIfCancellationRequested();
                var stage = workflow.Stages[i];

                if (g.BudgetTokens is long cap && state.Tokens >= cap)
                {
                    await BreachAsync(run, runId, state with { StageIndex = i }, "budget_hit", g, $"token budget {cap} reached", runCt);
                    return;
                }

                var isGate = string.Equals(stage.Gate, "human-approve", StringComparison.OrdinalIgnoreCase) || g.RequireHumanGate.Contains(stage.Id);
                if (isGate && !state.ApprovedGates.Contains(i))
                {
                    state = state with { StageIndex = i };
                    await stateStore.SaveAsync(runId, state, runCt);
                    run.Status = "waiting";
                    run.Question = $"Approve stage \"{stage.Title}\" to continue.";
                    run.UpdatedAt = DateTime.UtcNow;
                    await db.SaveChangesAsync(runCt);
                    await events.EmitAsync(runId, "info", stage.Id, "waiting", null, $"waiting for approval: {stage.Title}", runCt);
                    await events.BoardChangedAsync(run.ProjectId ?? "", runCt);
                    return;
                }

                var batchEnd = i;
                if (stage.Parallel && stage.Gate is null)
                    while (batchEnd + 1 < workflow.Stages.Count
                           && workflow.Stages[batchEnd + 1].Parallel
                           && workflow.Stages[batchEnd + 1].Gate is null)
                        batchEnd++;

                var indices = Enumerable.Range(i, batchEnd - i + 1).ToList();
                if (indices.Count > 1)
                    await events.EmitAsync(runId, "info", null, "running", null,
                        $"running {indices.Count} agents in parallel: {string.Join(", ", indices.Select(x => workflow.Stages[x].Title))}", runCt);

                var outcomes = await RunStagesAsync(runId, run.ProjectId ?? "", workflow, g, state, cwd, indices, runCt);

                var spent = 0;
                for (var k = 0; k < indices.Count; k++)
                {
                    spent += outcomes[k].TokensSpent;
                    state = state with { Context = AppendContext(state.Context, workflow.Stages[indices[k]], outcomes[k].Output) };
                }
                state = state with { Tokens = state.Tokens + spent };

                var failK = -1;
                for (var k = 0; k < outcomes.Count; k++) if (!outcomes[k].Passed) { failK = k; break; }

                if (failK >= 0)
                {
                    var (terminated, nextIndex, next) = await OnStageFailedAsync(
                        run, runId, workflow, g, state, indices[failK], workflow.Stages[indices[failK]], outcomes[failK], runCt);
                    state = next;
                    if (terminated) return;
                    i = nextIndex;
                    continue;
                }

                state = state with { StageIndex = batchEnd + 1 };
                await stateStore.SaveAsync(runId, state, runCt);
                i = batchEnd;
            }

            run.Status = "done";
            run.Question = null;
            run.Breach = null;
            run.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            runSpan?.SetTag("run.status", "done");
            OrchestrationTelemetry.RunsCompleted.Add(1);
            await events.EmitAsync(runId, "info", null, "done", null, "run completed", CancellationToken.None);
            await events.BoardChangedAsync(run.ProjectId ?? "", CancellationToken.None);
        }
        catch (OperationCanceledException)
        {
            OrchestrationTelemetry.RunsFailed.Add(1);
            runSpan?.SetTag("run.status", "stopped");
            var current = await db.Runs.FirstOrDefaultAsync(r => r.Id == runId);
            if (current is not null && current.Status is not ("stopped" or "done"))
            {
                current.Status = "stopped";
                current.Breach = "user_stop";
                current.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
            }
            await events.EmitAsync(runId, "warn", null, "stopped", "user_stop", "run stopped", CancellationToken.None);
            await events.BoardChangedAsync(run.ProjectId ?? "", CancellationToken.None);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "run {RunId} failed", runId);
            OrchestrationTelemetry.RunsFailed.Add(1);
            runSpan?.SetTag("run.status", "failed");
            var current = await db.Runs.FirstOrDefaultAsync(r => r.Id == runId);
            if (current is not null) { current.Status = "failed"; await db.SaveChangesAsync(); }
            await events.EmitAsync(runId, "error", null, "failed", null, ex.Message, CancellationToken.None);
        }
        finally
        {
            control.Remove(runId);
        }
    }

    private async Task<IReadOnlyList<StageOutcome>> RunStagesAsync(
        string runId, string projectId, WorkflowDef workflow, GuardrailsDef g, ExecutionState state, string cwd, IReadOnlyList<int> indices, CancellationToken runCt)
    {
        var jobs = new List<(StageDef stage, Stage row, string tier, string prompt)>();
        foreach (var idx in indices)
        {
            var stage = workflow.Stages[idx];
            var tier = ResolveTier(stage.Model, state.Model);
            var row = await db.Stages.FirstOrDefaultAsync(s => s.RunId == runId && s.StageId == stage.Id, runCt);
            if (row is null) { row = new Stage { RunId = runId, StageId = stage.Id, Title = stage.Title, Agent = stage.Agent, Order = idx }; db.Stages.Add(row); }
            row.Model = tier;
            row.Status = "running";
            jobs.Add((stage, row, tier, await composer.ComposeAsync(state, stage, workflow, runCt)));
        }
        await db.SaveChangesAsync(runCt);
        foreach (var job in jobs) await events.EmitStageAsync(runId, job.stage.Id, "running", runCt);

        StageOutcome[] outcomes;
        if (jobs.Count == 1)
        {
            outcomes = [await ExecuteInstrumentedAsync(runId, projectId, g, jobs[0].stage, jobs[0].tier, jobs[0].prompt, cwd, executor, runCt)];
        }
        else
        {
            var tasks = jobs.Select(job => RunIsolatedAsync(runId, projectId, g, job.stage, job.tier, job.prompt, cwd, runCt)).ToArray();
            outcomes = await Task.WhenAll(tasks);
        }

        for (var k = 0; k < jobs.Count; k++)
        {
            await PersistLogAsync(runId, jobs[k].stage.Id, outcomes[k], runCt);
            jobs[k].row.Attempts = outcomes[k].Attempts;
            jobs[k].row.Tokens += outcomes[k].TokensSpent;
            jobs[k].row.Status = outcomes[k].Passed ? "passed" : "failed";
        }
        await db.SaveChangesAsync(runCt);
        for (var k = 0; k < jobs.Count; k++)
            await events.EmitStageAsync(runId, jobs[k].stage.Id, outcomes[k].Passed ? "passed" : "failed", runCt);

        return outcomes;
    }

    private async Task<StageOutcome> RunIsolatedAsync(string runId, string projectId, GuardrailsDef g, StageDef stage, string tier, string prompt, string cwd, CancellationToken runCt)
    {
        using var scope = scopeFactory.CreateScope();
        var isolated = scope.ServiceProvider.GetRequiredService<IStageExecutor>();
        return await ExecuteInstrumentedAsync(runId, projectId, g, stage, tier, prompt, cwd, isolated, runCt);
    }

    private static async Task<StageOutcome> ExecuteInstrumentedAsync(string runId, string projectId, GuardrailsDef g, StageDef stage, string tier, string prompt, string cwd, IStageExecutor stageExecutor, CancellationToken runCt)
    {
        using var span = OrchestrationTelemetry.Activity.StartActivity("workflow.stage");
        span?.SetTag("stage.id", stage.Id);
        span?.SetTag("stage.agent", stage.Agent);
        span?.SetTag("stage.model", tier);
        var stopwatch = Stopwatch.StartNew();

        var outcome = await stageExecutor.ExecuteAsync(new StageExecutionContext(runId, projectId, stage, g, tier, prompt, cwd), runCt);

        stopwatch.Stop();
        var tag = new KeyValuePair<string, object?>("stage.id", stage.Id);
        OrchestrationTelemetry.StageTokens.Record(outcome.TokensSpent, tag);
        OrchestrationTelemetry.StageDurationMs.Record(stopwatch.Elapsed.TotalMilliseconds, tag);
        span?.SetTag("stage.tokens", outcome.TokensSpent);
        span?.SetTag("stage.passed", outcome.Passed);
        return outcome;
    }

    private async Task<(bool Terminated, int NextIndex, ExecutionState State)> OnStageFailedAsync(
        Run run, string runId, WorkflowDef workflow, GuardrailsDef g, ExecutionState state, int failIndex, StageDef failStage, StageOutcome outcome, CancellationToken runCt)
    {
        if (outcome.Breach == "quality_fail" && failIndex > 0 && state.LoopCount < g.MaxLoopDepth)
        {
            var anchor = failIndex - 1;
            state = state with
            {
                LoopCount = state.LoopCount + 1,
                StageIndex = anchor,
                Context = AppendContext(state.Context, failStage, $"[review] rework required: {outcome.Output}"),
            };
            await stateStore.SaveAsync(runId, state, runCt);
            OrchestrationTelemetry.StageLoops.Add(1);
            await events.EmitAsync(runId, "warn", failStage.Id, "running", null,
                $"loop {state.LoopCount}/{g.MaxLoopDepth}: reworking from \"{workflow.Stages[anchor].Title}\"", runCt);
            return (false, anchor - 1, state);
        }

        await BreachAsync(run, runId, state with { StageIndex = failIndex }, outcome.Breach, g, $"stage \"{failStage.Title}\" did not pass", runCt);
        return (true, failIndex, state);
    }

    private async Task BreachAsync(Run run, string runId, ExecutionState state, string reason, GuardrailsDef g, string message, CancellationToken ct)
    {
        await stateStore.SaveAsync(runId, state, ct);
        if (g.OnBreach == "stop")
        {
            run.Status = "failed";
            run.Breach = reason;
            run.Question = null;
        }
        else
        {
            run.Status = "waiting";
            run.Breach = reason;
            run.Question = $"{message}. Resume to continue.";
        }
        run.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        if (run.Status == "failed") OrchestrationTelemetry.RunsFailed.Add(1);
        await events.EmitAsync(runId, "warn", null, run.Status, reason, message, ct);
        await events.BoardChangedAsync(run.ProjectId ?? "", ct);
    }

    private async Task PersistLogAsync(string runId, string stageId, StageOutcome outcome, CancellationToken ct)
    {
        var log = await db.StageLogs.FirstOrDefaultAsync(l => l.RunId == runId && l.StageId == stageId, ct);
        if (log is null) { log = new StageLog { RunId = runId, StageId = stageId }; db.StageLogs.Add(log); }
        log.Text = outcome.LogText;
        log.Trace = outcome.LogTrace;
        log.Tokens = outcome.TokensSpent;
        await db.SaveChangesAsync(ct);
    }

    private async Task<string?> LatestPackManifestAsync(string packName)
    {
        if (string.IsNullOrEmpty(packName)) return null;
        var rows = await packages.Packs.Where(p => p.Name == packName).ToListAsync();
        return rows.Count == 0 ? null : rows.OrderByDescending(p => p.Version, StringComparer.Ordinal).First().Manifest;
    }

    private static string AppendContext(string context, StageDef stage, string output)
    {
        var snippet = output.Length > 800 ? output[..800] : output;
        var next = $"{context}\n[{stage.Title}] {snippet}".Trim();
        return next.Length > 4000 ? next[^4000..] : next;
    }

    private static string ResolveTier(string stageModel, string runModel)
        => string.IsNullOrEmpty(stageModel) || stageModel == "inherit" ? runModel : stageModel;
}
