using Vcc.Board.Contracts;

namespace Vcc.Board.Services;

public interface IBoardService
{
    Task<IReadOnlyList<BoardCardDto>> ListAsync(string projectId, CancellationToken ct);
    Task<BoardCardDto> CreateAsync(CreateBoardCardInput input, CancellationToken ct);
    Task<BoardCardDto?> UpdateAsync(string id, UpdateBoardCardInput input, CancellationToken ct);
    Task<BoardCardDto?> MoveAsync(string id, MoveBoardCardInput input, CancellationToken ct);
    Task<BoardCardDto?> SetLabelsAsync(string id, string[] labels, CancellationToken ct);
    Task<BoardCardDto?> SetAssigneeAsync(string id, string? assignee, CancellationToken ct);
    Task<BoardCardDto?> RunAsync(string id, CancellationToken ct);
    Task<bool> DeleteAsync(string id, CancellationToken ct);
    Task<BoardCardDto?> RerunAsync(string id, CancellationToken ct);
    Task<BoardCardDto?> LinkAsync(string id, string targetId, CancellationToken ct);
    Task<BoardCardDto?> UnlinkAsync(string id, string targetId, CancellationToken ct);
    Task<IReadOnlyList<BoardCardDto>> PlanAsync(string id, CancellationToken ct);
    Task<BoardCardDto?> CollectAsync(string id, CancellationToken ct);
    Task<IReadOnlyList<BoardCardDto>> CollectAllAsync(string projectId, CancellationToken ct);

    Task<IReadOnlyList<SprintDto>> ListSprintsAsync(string projectId, CancellationToken ct);
    Task<SprintDto> CreateSprintAsync(CreateSprintInput input, CancellationToken ct);

    Task<IReadOnlyList<BoardCommentDto>> ListCommentsAsync(string cardId, CancellationToken ct);
    Task<BoardCommentDto> AddCommentAsync(string cardId, CreateCommentInput input, CancellationToken ct);
    Task DeleteCommentAsync(string commentId, CancellationToken ct);

    Task<IReadOnlyList<BoardAutomationDto>> ListAutomationsAsync(string projectId, CancellationToken ct);
    Task<BoardAutomationDto> CreateAutomationAsync(CreateAutomationInput input, CancellationToken ct);
    Task<BoardAutomationDto?> SetAutomationEnabledAsync(string id, bool enabled, CancellationToken ct);
    Task DeleteAutomationAsync(string id, CancellationToken ct);

    Task<IReadOnlyList<BoardRunRowDto>> CardRunsAsync(string cardId, CancellationToken ct);
    Task<IReadOnlyList<BoardActivityDto>> CardActivityAsync(string cardId, CancellationToken ct);
    Task<IReadOnlyList<BoardCardDto>> ArtifactCardsAsync(string projectId, CancellationToken ct);
    Task<IReadOnlyList<ArtifactVersionDto>> ArtifactVersionsAsync(string projectId, CancellationToken ct);
    Task<IReadOnlyList<BundleDto>> BundlesAsync(string cardId, CancellationToken ct);

    PreviewStateDto PreviewStatus(string cardId);
    PreviewStateDto PreviewStart(string cardId, string? artifactId);
    PreviewStateDto PreviewStop(string cardId);
}
