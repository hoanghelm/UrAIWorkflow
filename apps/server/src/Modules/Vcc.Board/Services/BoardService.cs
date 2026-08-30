using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Vcc.Board.Contracts;
using Vcc.Board.Mapping;
using Vcc.Board.Common;
using Vcc.Board.Preview;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;
using Vcc.Orchestration.Runner;
using Vcc.Shared.Application.Common;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Board.Services;

public sealed class BoardService(
    IBoardDbContext board,
    IProjectDbContext projects,
    IRunDbContext runs,
    IRunnerService runner,
    IBoardMapper mapper,
    IPreviewStateStore previews,
    IWorktreeService worktrees) : IBoardService
{
    private static readonly JsonSerializerOptions Json = JsonDefaults.Web;

    public async Task<IReadOnlyList<BoardCardDto>> ListAsync(string projectId, CancellationToken ct)
    {
        var cards = await board.BoardCards.Where(c => c.ProjectId == projectId).OrderBy(c => c.Order).ToListAsync(ct);
        return cards.Select(mapper.ToDto).ToList();
    }

    public async Task<BoardCardDto> CreateAsync(CreateBoardCardInput input, CancellationToken ct)
    {
        var maxOrder = await board.BoardCards.Where(c => c.ProjectId == input.ProjectId)
            .Select(c => (int?)c.Order).MaxAsync(ct) ?? -1;
        var card = new BoardCard
        {
            ProjectId = input.ProjectId,
            Title = input.Title,
            Requirement = input.Requirement ?? "",
            Type = input.Type ?? BoardDefaults.Type,
            ParentId = input.ParentId,
            Pack = input.Pack ?? BoardDefaults.Pack,
            Model = input.Model ?? BoardDefaults.Model,
            MaxLoops = input.MaxLoops ?? BoardDefaults.MaxLoops,
            Labels = mapper.SerializeStrings(input.Labels ?? []),
            SprintId = input.SprintId,
            Assignee = input.Assignee,
            Status = BoardDefaults.StatusTodo,
            Order = maxOrder + 1,
        };
        board.BoardCards.Add(card);
        await board.SaveChangesAsync(ct);
        return mapper.ToDto(card);
    }

    public async Task<BoardCardDto?> UpdateAsync(string id, UpdateBoardCardInput input, CancellationToken ct)
    {
        var card = await board.BoardCards.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (card is null) return null;
        if (input.Title is not null) card.Title = input.Title;
        if (input.Requirement is not null) card.Requirement = input.Requirement;
        if (input.Type is not null) card.Type = input.Type;
        if (input.Pack is not null) card.Pack = input.Pack;
        if (input.Model is not null) card.Model = input.Model;
        if (input.MaxLoops is not null) card.MaxLoops = input.MaxLoops.Value;
        if (input.Status is not null) card.Status = input.Status;
        if (input.Review is not null) card.Review = input.Review;
        await board.SaveChangesAsync(ct);
        return mapper.ToDto(card);
    }

    public async Task<BoardCardDto?> MoveAsync(string id, MoveBoardCardInput input, CancellationToken ct)
    {
        var card = await board.BoardCards.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (card is null) return null;
        card.Status = input.Status;
        card.Order = input.Order;
        await board.SaveChangesAsync(ct);
        return mapper.ToDto(card);
    }

    public async Task<BoardCardDto?> SetLabelsAsync(string id, string[] labels, CancellationToken ct)
    {
        var card = await board.BoardCards.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (card is null) return null;
        card.Labels = mapper.SerializeStrings(labels);
        await board.SaveChangesAsync(ct);
        return mapper.ToDto(card);
    }

    public async Task<BoardCardDto?> SetAssigneeAsync(string id, string? assignee, CancellationToken ct)
    {
        var card = await board.BoardCards.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (card is null) return null;
        card.Assignee = assignee;
        await board.SaveChangesAsync(ct);
        return mapper.ToDto(card);
    }

    public async Task<BoardCardDto?> RunAsync(string id, CancellationToken ct)
    {
        var card = await board.BoardCards.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (card is null) return null;
        var project = await projects.Projects.FirstOrDefaultAsync(p => p.Id == card.ProjectId, ct);
        var request = new RunRequest(card.ProjectId, card.Id, card.Title, card.Requirement, card.Pack, card.Model, project?.Root ?? "");
        card.RunId = await runner.StartRunAsync(request, ct);
        card.Status = BoardDefaults.StatusInProcess;
        await board.SaveChangesAsync(ct);
        return mapper.ToDto(card);
    }

    public Task<BoardCardDto?> RerunAsync(string id, CancellationToken ct) => RunAsync(id, ct);

    public async Task<bool> DeleteAsync(string id, CancellationToken ct)
    {
        var card = await board.BoardCards.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (card is null) return false;
        board.BoardComments.RemoveRange(board.BoardComments.Where(c => c.CardId == id));
        board.BoardCards.Remove(card);
        await board.SaveChangesAsync(ct);
        return true;
    }

    public async Task<BoardCardDto?> LinkAsync(string id, string targetId, CancellationToken ct)
    {
        var card = await board.BoardCards.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (card is null) return null;
        var links = mapper.ParseStrings(card.Links).ToList();
        if (!links.Contains(targetId)) links.Add(targetId);
        card.Links = mapper.SerializeStrings(links);
        await board.SaveChangesAsync(ct);
        return mapper.ToDto(card);
    }

    public async Task<BoardCardDto?> UnlinkAsync(string id, string targetId, CancellationToken ct)
    {
        var card = await board.BoardCards.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (card is null) return null;
        var links = mapper.ParseStrings(card.Links).Where(l => l != targetId).ToList();
        card.Links = mapper.SerializeStrings(links);
        await board.SaveChangesAsync(ct);
        return mapper.ToDto(card);
    }

    public async Task<IReadOnlyList<BoardCardDto>> PlanAsync(string id, CancellationToken ct)
    {
        var parent = await board.BoardCards.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (parent is null) return [];
        var pieces = parent.Requirement.Split(['\n', '.', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(p => p.Length > 4).Take(5).ToList();
        if (pieces.Count == 0) pieces = ["Implement", "Test", "Review"];

        var maxOrder = await board.BoardCards.Where(c => c.ProjectId == parent.ProjectId).Select(c => (int?)c.Order).MaxAsync(ct) ?? -1;
        var created = new List<BoardCard>();
        foreach (var piece in pieces)
        {
            var child = new BoardCard
            {
                ProjectId = parent.ProjectId,
                Title = piece.Length > 80 ? piece[..80] : piece,
                Requirement = piece,
                Type = BoardDefaults.Type,
                ParentId = parent.Id,
                Pack = parent.Pack,
                Model = parent.Model,
                Status = BoardDefaults.StatusTodo,
                Order = ++maxOrder,
            };
            board.BoardCards.Add(child);
            created.Add(child);
        }
        await board.SaveChangesAsync(ct);
        return created.Select(mapper.ToDto).ToList();
    }

    public async Task<BoardCardDto?> CollectAsync(string id, CancellationToken ct)
    {
        var card = await board.BoardCards.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (card is null) return null;
        await CollectCardAsync(card, ct);
        await board.SaveChangesAsync(ct);
        return mapper.ToDto(card);
    }

    public async Task<IReadOnlyList<BoardCardDto>> CollectAllAsync(string projectId, CancellationToken ct)
    {
        var cards = await board.BoardCards.Where(c => c.ProjectId == projectId && c.RunId != null).ToListAsync(ct);
        foreach (var card in cards) await CollectCardAsync(card, ct);
        await board.SaveChangesAsync(ct);
        return cards.Select(mapper.ToDto).ToList();
    }

    private async Task CollectCardAsync(BoardCard card, CancellationToken ct)
    {
        if (card.RunId is null) return;
        var run = await runs.Runs.FirstOrDefaultAsync(r => r.Id == card.RunId, ct);
        var cwd = run?.Cwd;
        if (string.IsNullOrEmpty(cwd)) return;

        var changes = await worktrees.ChangesAsync(cwd, ct);
        var produced = changes.Where(c => c.Kind != ChangeKind.Deleted).ToList();
        if (produced.Count == 0) return;

        var files = new List<ArtifactFileRef>();
        long size = 0;
        foreach (var change in produced)
        {
            var full = Path.Combine(cwd, change.Path);
            if (File.Exists(full)) { try { size += new FileInfo(full).Length; } catch { } }
            files.Add(new ArtifactFileRef(Path.GetFileName(change.Path), change.Path, ArtifactKind.Classify(change.Path)));
        }

        var build = await board.Artifacts.Where(a => a.CardId == card.Id).Select(a => (int?)a.Build).MaxAsync(ct) ?? 0;
        board.Artifacts.Add(new Artifact
        {
            RunId = card.RunId,
            ProjectId = card.ProjectId,
            CardId = card.Id,
            Build = build + 1,
            Name = card.Title,
            Path = cwd,
            Files = JsonSerializer.Serialize(files, Json),
            FileCount = files.Count,
            SizeBytes = (int)Math.Min(size, int.MaxValue),
            Preview = JsonSerializer.Serialize(new BundlePreview(files.Any(f => f.Kind == "html"), "changes", null, cwd), Json),
        });
        card.Artifacts = mapper.SerializeArtifacts(files.Select(f => new ArtifactRef(f.Name, f.Path, f.Kind)));
    }

    public async Task<IReadOnlyList<SprintDto>> ListSprintsAsync(string projectId, CancellationToken ct)
    {
        var sprints = await board.Sprints.Where(s => s.ProjectId == projectId).OrderByDescending(s => s.CreatedAt).ToListAsync(ct);
        return sprints.Select(mapper.ToDto).ToList();
    }

    public async Task<SprintDto> CreateSprintAsync(CreateSprintInput input, CancellationToken ct)
    {
        var sprint = new Sprint { ProjectId = input.ProjectId, Name = input.Name };
        board.Sprints.Add(sprint);
        await board.SaveChangesAsync(ct);
        return mapper.ToDto(sprint);
    }

    public async Task<IReadOnlyList<BoardCommentDto>> ListCommentsAsync(string cardId, CancellationToken ct)
    {
        var comments = await board.BoardComments.Where(c => c.CardId == cardId).OrderBy(c => c.CreatedAt).ToListAsync(ct);
        return comments.Select(mapper.ToDto).ToList();
    }

    public async Task<BoardCommentDto> AddCommentAsync(string cardId, CreateCommentInput input, CancellationToken ct)
    {
        var comment = new BoardComment
        {
            CardId = cardId,
            Author = input.Author ?? BoardDefaults.CommentAuthor,
            Kind = input.Kind ?? BoardDefaults.CommentKind,
            Body = input.Body ?? "",
        };
        board.BoardComments.Add(comment);

        var review = ReviewFor(comment.Kind);
        if (review is not null)
        {
            var card = await board.BoardCards.FirstOrDefaultAsync(c => c.Id == cardId, ct);
            if (card is not null) card.Review = review;
        }

        await board.SaveChangesAsync(ct);
        return mapper.ToDto(comment);
    }

    private static string? ReviewFor(string commentKind) => commentKind switch
    {
        BoardDefaults.CommentApprove => BoardDefaults.ReviewApproved,
        BoardDefaults.CommentRequestChanges => BoardDefaults.ReviewChangesRequested,
        _ => null,
    };

    public async Task DeleteCommentAsync(string commentId, CancellationToken ct)
    {
        var comment = await board.BoardComments.FirstOrDefaultAsync(c => c.Id == commentId, ct);
        if (comment is not null) { board.BoardComments.Remove(comment); await board.SaveChangesAsync(ct); }
    }

    public async Task<IReadOnlyList<BoardAutomationDto>> ListAutomationsAsync(string projectId, CancellationToken ct)
    {
        var items = await board.BoardAutomations.Where(a => a.ProjectId == projectId).OrderByDescending(a => a.CreatedAt).ToListAsync(ct);
        return items.Select(mapper.ToDto).ToList();
    }

    public async Task<BoardAutomationDto> CreateAutomationAsync(CreateAutomationInput input, CancellationToken ct)
    {
        var automation = new BoardAutomation { ProjectId = input.ProjectId, Trigger = input.Trigger, Action = input.Action };
        board.BoardAutomations.Add(automation);
        await board.SaveChangesAsync(ct);
        return mapper.ToDto(automation);
    }

    public async Task<BoardAutomationDto?> SetAutomationEnabledAsync(string id, bool enabled, CancellationToken ct)
    {
        var automation = await board.BoardAutomations.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (automation is null) return null;
        automation.Enabled = enabled;
        await board.SaveChangesAsync(ct);
        return mapper.ToDto(automation);
    }

    public async Task DeleteAutomationAsync(string id, CancellationToken ct)
    {
        var automation = await board.BoardAutomations.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (automation is not null) { board.BoardAutomations.Remove(automation); await board.SaveChangesAsync(ct); }
    }

    public async Task<IReadOnlyList<BoardRunRowDto>> CardRunsAsync(string cardId, CancellationToken ct)
    {
        var rows = await runs.Runs.Where(r => r.CardId == cardId).OrderByDescending(r => r.CreatedAt).ToListAsync(ct);
        return rows.Select(r => new BoardRunRowDto(r.Id, r.Name, r.Status, r.Pack, r.TokensConsumed, r.TokensSaved, r.CreatedAt.ToString("O"))).ToList();
    }

    public async Task<IReadOnlyList<BoardActivityDto>> CardActivityAsync(string cardId, CancellationToken ct)
    {
        var runIds = await runs.Runs.Where(r => r.CardId == cardId).Select(r => r.Id).ToListAsync(ct);
        var events = await runs.RunEvents.Where(e => runIds.Contains(e.RunId)).OrderByDescending(e => e.At).Take(50).ToListAsync(ct);
        var comments = await board.BoardComments.Where(c => c.CardId == cardId).OrderByDescending(c => c.CreatedAt).ToListAsync(ct);

        var activity = new List<BoardActivityDto>();
        activity.AddRange(events.Select(e => new BoardActivityDto(e.At.ToString("O"), e.Level, e.Message, e.RunId, "ai")));
        activity.AddRange(comments.Select(c => new BoardActivityDto(c.CreatedAt.ToString("O"), "info", c.Body, null, "item")));
        return activity.OrderByDescending(a => a.At).ToList();
    }

    public async Task<IReadOnlyList<BoardCardDto>> ArtifactCardsAsync(string projectId, CancellationToken ct)
    {
        var cards = await board.BoardCards.Where(c => c.ProjectId == projectId && c.Artifacts != "[]").OrderBy(c => c.Order).ToListAsync(ct);
        return cards.Select(mapper.ToDto).ToList();
    }

    public async Task<IReadOnlyList<ArtifactVersionDto>> ArtifactVersionsAsync(string projectId, CancellationToken ct)
    {
        var artifacts = await board.Artifacts.Where(a => a.ProjectId == projectId).OrderByDescending(a => a.CreatedAt).ToListAsync(ct);
        var cards = await board.BoardCards.Where(c => c.ProjectId == projectId).ToDictionaryAsync(c => c.Id, c => c.Type, ct);
        return artifacts.Select(a => mapper.ToVersionDto(a, a.CardId is not null && cards.TryGetValue(a.CardId, out var t) ? t : BoardDefaults.Type)).ToList();
    }

    public async Task<IReadOnlyList<BundleDto>> BundlesAsync(string cardId, CancellationToken ct)
    {
        var artifacts = await board.Artifacts.Where(a => a.CardId == cardId).OrderByDescending(a => a.Build).ToListAsync(ct);
        return artifacts.Select(mapper.ToBundleDto).ToList();
    }

    public PreviewStateDto PreviewStatus(string cardId)
        => previews.Get(cardId) ?? new PreviewStateDto("stopped", null, []);

    public PreviewStateDto PreviewStart(string cardId, string? artifactId)
    {
        var state = new PreviewStateDto("running", $"/api/board/{cardId}/preview/content", ["preview started"]);
        previews.Set(cardId, state);
        return state;
    }

    public PreviewStateDto PreviewStop(string cardId)
    {
        previews.Remove(cardId);
        return new PreviewStateDto("stopped", null, ["preview stopped"]);
    }
}
