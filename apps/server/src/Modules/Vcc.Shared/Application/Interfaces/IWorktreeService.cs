namespace Vcc.Shared.Application.Interfaces;

public enum ChangeKind { Added, Modified, Deleted, Renamed }

public sealed record WorktreeInfo(string Path, string? Branch, bool IsGit);

public sealed record WorktreeChange(string Path, ChangeKind Kind, int Additions, int Deletions);

public sealed record WorktreeDiff(string Patch, IReadOnlyList<WorktreeChange> Files, string Branch, string Path);

public sealed record WorktreeCommit(bool Committed, string Branch, string? Sha, string Message);

public interface IWorktreeService
{
    Task<WorktreeInfo> CreateAsync(string projectRoot, string runId, CancellationToken ct);
    Task<IReadOnlyList<WorktreeChange>> ChangesAsync(string worktreePath, CancellationToken ct);
    Task<WorktreeDiff> DiffAsync(string worktreePath, CancellationToken ct);
    Task<WorktreeCommit> CommitAsync(string worktreePath, string message, CancellationToken ct);
    Task RemoveAsync(string worktreePath, CancellationToken ct);
}
