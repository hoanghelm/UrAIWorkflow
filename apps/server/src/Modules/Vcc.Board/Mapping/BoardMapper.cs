using System.Text.Json;
using Vcc.Board.Contracts;
using Vcc.Domain.Entities;
using Vcc.Shared.Application.Common;

namespace Vcc.Board.Mapping;

public sealed class BoardMapper : IBoardMapper
{
    private static readonly JsonSerializerOptions Json = JsonDefaults.Web;

    public BoardCardDto ToDto(BoardCard c) => new(
        c.Id, c.ProjectId, c.Title, c.Requirement, c.Type, c.ParentId, c.Pack, c.Model, c.MaxLoops,
        c.Status, c.Review, c.RunId, c.Worktree, ParseArtifactRefs(c.Artifacts), ParseStrings(c.Links), ParseStrings(c.Labels),
        c.SprintId, c.Assignee, c.Order);

    public SprintDto ToDto(Sprint s) => new(s.Id, s.ProjectId, s.Name);

    public BoardCommentDto ToDto(BoardComment c) => new(c.Id, c.CardId, c.Author, c.Kind, c.Body, c.CreatedAt.ToString("O"));

    public BoardAutomationDto ToDto(BoardAutomation a) => new(a.Id, a.ProjectId, a.Trigger, a.Action, a.Enabled);

    public ArtifactVersionDto ToVersionDto(Artifact a, string type) => new(
        a.Id, a.CardId, a.RunId, a.Build, a.Name, type, a.FileCount, a.SizeBytes, ParseFiles(a.Files), a.CreatedAt.ToString("O"));

    public BundleDto ToBundleDto(Artifact a) => new(
        a.Id, a.Build, a.Name, a.SizeBytes, a.FileCount, ParseFiles(a.Files), ParsePreview(a.Preview), a.CreatedAt.ToString("O"));

    public IReadOnlyList<string> ParseStrings(string json)
    {
        try { return JsonSerializer.Deserialize<List<string>>(json, Json) ?? []; }
        catch { return []; }
    }

    public IReadOnlyList<ArtifactFileRef> ParseFiles(string json)
    {
        try { return JsonSerializer.Deserialize<List<ArtifactFileRef>>(json, Json) ?? []; }
        catch { return []; }
    }

    public string SerializeStrings(IEnumerable<string> values) => JsonSerializer.Serialize(values, Json);

    public string SerializeArtifacts(IEnumerable<ArtifactRef> refs) => JsonSerializer.Serialize(refs, Json);

    private static IReadOnlyList<ArtifactRef> ParseArtifactRefs(string json)
    {
        try { return JsonSerializer.Deserialize<List<ArtifactRef>>(json, Json) ?? []; }
        catch { return []; }
    }

    private static BundlePreview ParsePreview(string json)
    {
        try { return JsonSerializer.Deserialize<BundlePreview>(json, Json) ?? new BundlePreview(null, null, null, null); }
        catch { return new BundlePreview(null, null, null, null); }
    }
}
