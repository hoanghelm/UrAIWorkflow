namespace Vcc.Shared.Application.Interfaces;

public sealed record MemoryItem(string Id, string ProjectId, string Scope, string Key, string Content, DateTime UpdatedAt);

public interface IMemoryStore
{
    Task<IReadOnlyList<MemoryItem>> ListAsync(string projectId, CancellationToken ct);
    Task<MemoryItem> UpsertAsync(string projectId, string scope, string key, string content, CancellationToken ct);
    Task<bool> DeleteAsync(string id, CancellationToken ct);
    Task<string> RecallAsync(string projectId, int maxChars, CancellationToken ct);
}
