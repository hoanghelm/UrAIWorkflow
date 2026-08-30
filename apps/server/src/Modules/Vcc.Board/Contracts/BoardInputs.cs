namespace Vcc.Board.Contracts;

public sealed record CreateBoardCardInput(
    string ProjectId, string Title, string? Requirement, string? Type, string? ParentId,
    string? Pack, string? Model, int? MaxLoops, string[]? Labels, string? SprintId, string? Assignee);

public sealed record UpdateBoardCardInput(
    string? Title, string? Requirement, string? Type, string? Pack, string? Model, int? MaxLoops, string? Status, string? Review);

public sealed record MoveBoardCardInput(string Status, int Order);

public sealed record LabelsInput(string[] Labels);

public sealed record AssigneeInput(string? Assignee);

public sealed record CreateSprintInput(string ProjectId, string Name);

public sealed record CreateAutomationInput(string ProjectId, string Trigger, string Action);

public sealed record CreateCommentInput(string? Body, string? Kind, string? Author);

public sealed record EnabledInput(bool Enabled);

public sealed record LinkInput(string TargetId);

public sealed record ProjectIdInput(string ProjectId);

public sealed record PlanInput(string? StreamId);

public sealed record PreviewStartInput(string? ArtifactId);
