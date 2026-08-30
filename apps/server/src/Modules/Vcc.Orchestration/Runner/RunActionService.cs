using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;
using Vcc.Shared.Application.Interfaces;
using Vcc.Orchestration.State;

namespace Vcc.Orchestration.Runner;

public sealed record CreateRunInput(string ProjectId, string? CardId, string? Cwd, string? Title, JsonElement Workflow);
public sealed record RunDiffFile(string Path, int Additions, int Deletions);
public sealed record RunDiffDto(string Patch, IReadOnlyList<RunDiffFile> Files, string Branch, string Cwd);
public sealed record RunCommitDto(bool Committed, string Branch, string? Sha, string Message);

public interface IRunActionService
{
    Task<string> CreateAsync(CreateRunInput input, CancellationToken ct);
    Task<bool> ResumeAsync(string runId, string answer, CancellationToken ct);
    Task<bool> StopAsync(string runId, CancellationToken ct);
    Task<bool> RerunStageAsync(string runId, string stageId, CancellationToken ct);
    Task<bool> DeleteAsync(string runId, CancellationToken ct);
    Task<RunDiffDto> DiffAsync(string runId, CancellationToken ct);
    Task<RunCommitDto> CommitAsync(string runId, CancellationToken ct);
}

public sealed class RunActionService(IRunDbContext db, IProjectDbContext projects, IRunnerService runner, IRunControl control, IWorktreeService worktrees) : IRunActionService
{
    public async Task<string> CreateAsync(CreateRunInput input, CancellationToken ct)
    {
        var project = await projects.Projects.FirstOrDefaultAsync(p => p.Id == input.ProjectId, ct);
        var title = input.Title ?? "run";
        var workflow = input.Workflow.ValueKind == JsonValueKind.Undefined ? "{}" : input.Workflow.GetRawText();
        var pack = TryGet(input.Workflow, "pack") ?? "eng-loop";
        var model = TryGet(input.Workflow, "model") ?? "sonnet";
        var request = new RunRequest(input.ProjectId, input.CardId ?? "", title, title, pack, model,
            project?.Root ?? "", input.Cwd, workflow);
        return await runner.StartRunAsync(request, ct);
    }

    private static string? TryGet(JsonElement el, string prop)
        => el.ValueKind == JsonValueKind.Object && el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    public async Task<bool> ResumeAsync(string runId, string answer, CancellationToken ct)
    {
        var run = await db.Runs.FirstOrDefaultAsync(r => r.Id == runId, ct);
        if (run is null) return false;
        db.RunEvents.Add(new RunEvent { RunId = runId, Level = "info", Status = "running", Message = $"resumed: {answer}" });
        await db.SaveChangesAsync(ct);
        await runner.ResumeRunAsync(runId, answer, ct);
        return true;
    }

    public async Task<bool> StopAsync(string runId, CancellationToken ct)
    {
        var run = await db.Runs.FirstOrDefaultAsync(r => r.Id == runId, ct);
        if (run is null) return false;

        var cancelled = control.Cancel(runId);
        if (!cancelled)
        {
            run.Status = "stopped";
            run.Breach = "user_stop";
            run.UpdatedAt = DateTime.UtcNow;
            db.RunEvents.Add(new RunEvent { RunId = runId, Level = "warn", Status = "stopped", Breach = "user_stop", Message = "run stopped" });
            await db.SaveChangesAsync(ct);
        }
        return true;
    }

    public async Task<bool> RerunStageAsync(string runId, string stageId, CancellationToken ct)
    {
        var stage = await db.Stages.FirstOrDefaultAsync(s => s.RunId == runId && s.StageId == stageId, ct);
        if (stage is null) return false;
        db.RunEvents.Add(new RunEvent { RunId = runId, Level = "info", StageId = stageId, StageStatus = "pending", Message = $"rerun from {stageId}" });
        await db.SaveChangesAsync(ct);
        await runner.RerunFromAsync(runId, stageId, ct);
        return true;
    }

    public async Task<bool> DeleteAsync(string runId, CancellationToken ct)
    {
        var run = await db.Runs.FirstOrDefaultAsync(r => r.Id == runId, ct);
        if (run is null) return false;
        db.Stages.RemoveRange(db.Stages.Where(s => s.RunId == runId));
        db.RunEvents.RemoveRange(db.RunEvents.Where(e => e.RunId == runId));
        db.StageLogs.RemoveRange(db.StageLogs.Where(l => l.RunId == runId));
        db.Checkpoints.RemoveRange(db.Checkpoints.Where(c => c.RunId == runId));
        db.Runs.Remove(run);
        await db.SaveChangesAsync(ct);
        if (!string.IsNullOrEmpty(run.Cwd)) await worktrees.RemoveAsync(run.Cwd!, ct);
        return true;
    }

    public async Task<RunDiffDto> DiffAsync(string runId, CancellationToken ct)
    {
        var run = await db.Runs.FirstOrDefaultAsync(r => r.Id == runId, ct);
        if (run?.Cwd is null || run.Cwd.Length == 0) return new RunDiffDto("", [], "", "");

        var diff = await worktrees.DiffAsync(run.Cwd, ct);
        var files = diff.Files.Select(f => new RunDiffFile(f.Path, f.Additions, f.Deletions)).ToList();
        return new RunDiffDto(diff.Patch, files, diff.Branch, diff.Path);
    }

    public async Task<RunCommitDto> CommitAsync(string runId, CancellationToken ct)
    {
        var run = await db.Runs.FirstOrDefaultAsync(r => r.Id == runId, ct);
        if (run?.Cwd is null || run.Cwd.Length == 0) return new RunCommitDto(false, "", null, "no git worktree");

        var commit = await worktrees.CommitAsync(run.Cwd, $"vcc: {run.Name}", ct);
        return new RunCommitDto(commit.Committed, commit.Branch, commit.Sha, commit.Message);
    }
}
