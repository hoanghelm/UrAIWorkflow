using Microsoft.EntityFrameworkCore;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;

namespace Vcc.Orchestration.Runner;

public sealed record RunStageDto(string Id, string StageId, string Title, string Agent, string Model, string Status, int Attempts, int Order);

public sealed record RunRowDto(
    string Id, string ProjectId, string? Kind, string Name, string Pack, string Status,
    string? Breach, string? Question, int TokensConsumed, int TokensSaved, int TokensInput,
    int TokensOutput, int TokensCached, string CreatedAt, string Workflow, IReadOnlyList<RunStageDto> Stages);

public sealed record RunEventDto(string RunId, string At, string Level, string? StageId, string? Status, string? StageStatus, string? Breach, string Message);

public sealed record RunLogDto(string Text, string Trace, int Tokens);

public sealed record RunArtifactRef(string Name, string Path, string Kind);
public sealed record RunArtifactsDto(string? CardId, string? ArtifactId, string? Worktree, IReadOnlyList<RunArtifactRef> Artifacts);

public sealed record HeadroomDto(long WindowMs, int Requests, int MaxRequests, int RequestHeadroom, int Tokens, int MaxTokens, int TokenHeadroom, int Waiting);

public interface IRunReadService
{
    Task<IReadOnlyList<RunRowDto>> ListAsync(string? projectId, CancellationToken ct);
    Task<RunRowDto?> GetAsync(string runId, CancellationToken ct);
    Task<IReadOnlyList<RunEventDto>> EventsAsync(string runId, CancellationToken ct);
    Task<IReadOnlyDictionary<string, RunLogDto>> LogsAsync(string runId, CancellationToken ct);
    Task<RunArtifactsDto> ArtifactsAsync(string runId, CancellationToken ct);
    Task<HeadroomDto> HeadroomAsync(CancellationToken ct);
}

public sealed class RunReadService(IRunDbContext db, IBoardDbContext board) : IRunReadService
{
    internal static RunStageDto ToDto(Stage s) => new(s.Id, s.StageId, s.Title, s.Agent, s.Model, s.Status, s.Attempts, s.Order);

    internal static RunRowDto ToDto(Run r, IReadOnlyList<Stage> stages) => new(
        r.Id, r.ProjectId ?? "", r.Kind, r.Name, r.Pack, r.Status, r.Breach, r.Question,
        r.TokensConsumed, r.TokensSaved, r.TokensInput, r.TokensOutput, r.TokensCached,
        r.CreatedAt.ToString("O"), r.Workflow, stages.Select(ToDto).ToList());

    public async Task<IReadOnlyList<RunRowDto>> ListAsync(string? projectId, CancellationToken ct)
    {
        var runs = await db.Runs.Where(r => projectId == null || r.ProjectId == projectId)
            .OrderByDescending(r => r.CreatedAt).ToListAsync(ct);
        var ids = runs.Select(r => r.Id).ToList();
        var stages = await db.Stages.Where(s => ids.Contains(s.RunId)).ToListAsync(ct);
        var byRun = stages.GroupBy(s => s.RunId).ToDictionary(g => g.Key, g => (IReadOnlyList<Stage>)g.OrderBy(s => s.Order).ToList());
        return runs.Select(r => ToDto(r, byRun.TryGetValue(r.Id, out var st) ? st : [])).ToList();
    }

    public async Task<RunRowDto?> GetAsync(string runId, CancellationToken ct)
    {
        var run = await db.Runs.FirstOrDefaultAsync(r => r.Id == runId, ct);
        if (run is null) return null;
        var stages = await db.Stages.Where(s => s.RunId == runId).OrderBy(s => s.Order).ToListAsync(ct);
        return ToDto(run, stages);
    }

    public async Task<IReadOnlyList<RunEventDto>> EventsAsync(string runId, CancellationToken ct)
    {
        var events = await db.RunEvents.Where(e => e.RunId == runId).OrderBy(e => e.At).ToListAsync(ct);
        return events.Select(e => new RunEventDto(e.RunId, e.At.ToString("O"), e.Level, e.StageId, e.Status, e.StageStatus, e.Breach, e.Message)).ToList();
    }

    public async Task<IReadOnlyDictionary<string, RunLogDto>> LogsAsync(string runId, CancellationToken ct)
    {
        var logs = await db.StageLogs.Where(l => l.RunId == runId).ToListAsync(ct);
        return logs.GroupBy(l => l.StageId)
            .ToDictionary(g => g.Key, g =>
            {
                var last = g.OrderBy(l => l.CreatedAt).Last();
                return new RunLogDto(
                    string.Join("\n", g.OrderBy(l => l.CreatedAt).Select(l => l.Text).Where(t => t.Length > 0)),
                    string.Join("\n", g.OrderBy(l => l.CreatedAt).Select(l => l.Trace).Where(t => t.Length > 0)),
                    g.Sum(l => l.Tokens));
            });
    }

    public async Task<RunArtifactsDto> ArtifactsAsync(string runId, CancellationToken ct)
    {
        var run = await db.Runs.FirstOrDefaultAsync(r => r.Id == runId, ct);
        if (run is null) return new RunArtifactsDto(null, null, null, []);

        var artifact = await db.Runs.Where(r => r.Id == runId).Select(r => r.CardId).FirstOrDefaultAsync(ct);
        var refs = new List<RunArtifactRef>();
        string? artifactId = null;

        if (run.CardId is not null)
        {
            var card = await board.BoardCards.FirstOrDefaultAsync(c => c.Id == run.CardId, ct);
            if (card is not null)
            {
                try
                {
                    var parsed = System.Text.Json.JsonSerializer.Deserialize<List<RunArtifactRef>>(card.Artifacts, new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web));
                    if (parsed is not null) refs.AddRange(parsed);
                }
                catch { }
            }
        }

        var bundle = await board.Artifacts.Where(a => a.RunId == runId).OrderByDescending(a => a.Build).FirstOrDefaultAsync(ct);
        if (bundle is not null) artifactId = bundle.Id;

        return new RunArtifactsDto(run.CardId, artifactId, run.Cwd, refs);
    }

    public async Task<HeadroomDto> HeadroomAsync(CancellationToken ct)
    {
        const long windowMs = 60_000;
        const int maxRequests = 50;
        const int maxTokens = 200_000;
        var since = DateTime.UtcNow.AddMilliseconds(-windowMs);
        var recent = await db.Runs.Where(r => r.CreatedAt >= since).ToListAsync(ct);
        var requests = recent.Count;
        var tokens = recent.Sum(r => r.TokensConsumed);
        var waiting = await db.Runs.CountAsync(r => r.Status == "pending" || r.Status == "waiting", ct);
        return new HeadroomDto(windowMs, requests, maxRequests, Math.Max(0, maxRequests - requests),
            tokens, maxTokens, Math.Max(0, maxTokens - tokens), waiting);
    }
}
