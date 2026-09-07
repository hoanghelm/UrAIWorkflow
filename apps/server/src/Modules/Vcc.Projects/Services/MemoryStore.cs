using System.Text;
using Microsoft.EntityFrameworkCore;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Projects.Services;

public sealed class MemoryStore(IMemoryDbContext db) : IMemoryStore
{
    public async Task<IReadOnlyList<MemoryItem>> ListAsync(string projectId, CancellationToken ct)
    {
        var rows = await db.MemoryEntries
            .Where(m => m.ProjectId == projectId)
            .OrderBy(m => m.Scope).ThenBy(m => m.Key)
            .ToListAsync(ct);
        return rows.Select(ToItem).ToList();
    }

    public async Task<MemoryItem> UpsertAsync(string projectId, string scope, string key, string content, CancellationToken ct)
    {
        var row = await db.MemoryEntries.FirstOrDefaultAsync(m => m.ProjectId == projectId && m.Scope == scope && m.Key == key, ct);
        if (row is null)
        {
            row = new MemoryEntry { ProjectId = projectId, Scope = scope, Key = key, Content = content };
            db.MemoryEntries.Add(row);
        }
        else
        {
            row.Content = content;
            row.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync(ct);
        return ToItem(row);
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken ct)
    {
        var row = await db.MemoryEntries.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (row is null) return false;
        db.MemoryEntries.Remove(row);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<string> RecallAsync(string projectId, int maxChars, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(projectId)) return "";
        var rows = await db.MemoryEntries
            .Where(m => m.ProjectId == projectId && m.Scope == "project")
            .OrderBy(m => m.Key)
            .ToListAsync(ct);
        if (rows.Count == 0) return "";

        var sb = new StringBuilder();
        foreach (var row in rows)
        {
            var line = $"- {row.Key}: {row.Content}";
            if (sb.Length + line.Length > maxChars) break;
            sb.AppendLine(line);
        }
        return sb.ToString().TrimEnd();
    }

    private static MemoryItem ToItem(MemoryEntry m) => new(m.Id, m.ProjectId, m.Scope, m.Key, m.Content, m.UpdatedAt);
}
