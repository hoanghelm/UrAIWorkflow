namespace Vcc.Board.Contracts;

public sealed record ArtifactRef(string Name, string Path, string Kind);

public sealed record BoardCardDto(
    string Id, string ProjectId, string Title, string Requirement, string Type,
    string? ParentId, string Pack, string Model, int MaxLoops, string Status,
    string Review, string? RunId, string? Worktree, IReadOnlyList<ArtifactRef> Artifacts,
    IReadOnlyList<string> Links, IReadOnlyList<string> Labels, string? SprintId, string? Assignee, int Order);

public sealed record SprintDto(string Id, string ProjectId, string Name);

public sealed record BoardCommentDto(string Id, string CardId, string Author, string Kind, string Body, string CreatedAt);

public sealed record BoardAutomationDto(string Id, string ProjectId, string Trigger, string Action, bool Enabled);

public sealed record BoardRunRowDto(string Id, string Name, string Status, string Pack, int TokensConsumed, int TokensSaved, string CreatedAt);

public sealed record BoardActivityDto(string At, string Level, string Message, string? RunId, string Source);

public sealed record ArtifactFileRef(string Name, string Path, string Kind);

public sealed record ArtifactVersionDto(
    string Id, string? CardId, string? RunId, int Build, string Title, string Type,
    int FileCount, int SizeBytes, IReadOnlyList<ArtifactFileRef> Files, string CreatedAt);

public sealed record BundlePreview(bool? Runnable, string? Kind, string? Note, string? Dir);

public sealed record BundleDto(
    string Id, int Build, string Name, int SizeBytes, int FileCount,
    IReadOnlyList<ArtifactFileRef> Files, BundlePreview Preview, string CreatedAt);

public sealed record PreviewStateDto(string Status, string? Url, IReadOnlyList<string> Logs);
