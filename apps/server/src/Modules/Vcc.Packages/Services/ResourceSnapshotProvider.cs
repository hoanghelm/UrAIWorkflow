using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;
using Vcc.Packages.Bundles;
using Vcc.Packages.Common;
using Vcc.Shared.Application.Common;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Packages.Services;

public sealed class ResourceSnapshotProvider(IPackageDbContext db, IProjectDbContext projects, IResourceStore store) : IResourceSnapshot
{
    public async Task<string> BuildAsync(string projectId, string packName, IReadOnlyList<string> skills, IReadOnlyList<string> agents, CancellationToken ct)
    {
        var bundles = await db.Bundles.Where(b => b.Key != "").ToListAsync(ct);
        var pinByKey = new Dictionary<string, string>(StringComparer.Ordinal);
        if (!string.IsNullOrEmpty(projectId))
            foreach (var c in await db.CatalogItems.Where(c => c.ProjectId == projectId && c.Pinned && c.Key != "").ToListAsync(ct))
                pinByKey[c.Key] = c.Version;

        var chosen = new Dictionary<string, Bundle>(StringComparer.Ordinal);
        foreach (var group in bundles.GroupBy(b => b.Key, StringComparer.Ordinal))
        {
            var pick = pinByKey.TryGetValue(group.Key, out var pinned)
                ? group.FirstOrDefault(b => b.Version == pinned)
                : null;
            chosen[group.Key] = pick ?? group.OrderByDescending(b => Semver.Key(b.Version)).First();
        }

        var skillIndex = new Dictionary<string, (string key, string rel)>(StringComparer.Ordinal);
        var agentIndex = new Dictionary<string, (string key, string rel)>(StringComparer.Ordinal);
        foreach (var b in chosen.Values)
            foreach (var provided in store.Provides(ParseEntries(b.Meta)))
            {
                if (provided.Kind == "skill") skillIndex.TryAdd(provided.Name, (b.Key, provided.RelPath));
                else if (provided.Kind == "agent") agentIndex.TryAdd(provided.Name, (b.Key, provided.RelPath));
            }

        var skillPins = ResolvePins(skills, skillIndex, chosen);
        var agentPins = ResolvePins(agents, agentIndex, chosen);
        var pack = await ResolvePackAsync(projectId, packName, ct);

        return JsonSerializer.Serialize(new ResourceSnapshot(pack, skillPins, agentPins), PackJson.Options);
    }

    private Dictionary<string, ResourcePin> ResolvePins(
        IReadOnlyList<string> names, Dictionary<string, (string key, string rel)> index, Dictionary<string, Bundle> chosen)
    {
        var pins = new Dictionary<string, ResourcePin>(StringComparer.Ordinal);
        foreach (var name in names.Distinct(StringComparer.Ordinal))
        {
            if (string.IsNullOrWhiteSpace(name) || !index.TryGetValue(name, out var loc)) continue;
            var b = chosen[loc.key];
            store.Ensure(b.Key, b.Version, b.Archive);
            var path = Path.Combine(store.VersionDir(b.Key, b.Version), loc.rel.Replace('/', Path.DirectorySeparatorChar));
            pins[name] = new ResourcePin(b.Version, b.Hash, path);
        }
        return pins;
    }

    private async Task<PackPin?> ResolvePackAsync(string projectId, string packName, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(packName)) return null;
        var rows = await db.Packs.Where(p => p.Name == packName).ToListAsync(ct);
        if (rows.Count == 0) return null;

        string? pinned = null;
        if (!string.IsNullOrEmpty(projectId))
            pinned = (await projects.ProjectPacks.FirstOrDefaultAsync(p => p.ProjectId == projectId && p.PackName == packName, ct))?.InstalledVersion;

        var pick = (pinned is not null ? rows.FirstOrDefault(r => r.Version == pinned) : null)
            ?? rows.OrderByDescending(r => Semver.Key(r.Version)).First();
        return new PackPin(packName, pick.Version);
    }

    private static IReadOnlyList<string> ParseEntries(string meta)
    {
        try
        {
            var parsed = JsonSerializer.Deserialize<BundleMeta>(string.IsNullOrEmpty(meta) ? "{}" : meta, PackJson.Options);
            return parsed?.Entries ?? [];
        }
        catch { return []; }
    }
}
