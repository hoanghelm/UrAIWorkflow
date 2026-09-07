using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;
using Vcc.Packages.Bundles;
using Vcc.Packages.Common;
using Vcc.Packages.Contracts;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Packages.Services;

public sealed class MarketplaceService(IPackageDbContext db, IProjectDbContext projects, IBundleStore store, IResourceStore resources, IBundleFetcher fetcher, IConfiguration config, IFeatureFlags features) : IMarketplaceService
{
    private const string MarketplaceScope = "project";
    private const string MarketplaceSource = "marketplace";
    private const string DefaultVersion = "1.0.0";
    private static readonly JsonSerializerOptions Json = PackJson.Options;

    private string GlobalRoot =>
        config["VCC_GLOBAL_ROOT"] is { Length: > 0 } configured ? configured : Path.Combine(AppContext.BaseDirectory, "data", "global");

    private static string ComputeSeedStamp(IReadOnlyList<Bundle> bundles)
    {
        var version = typeof(MarketplaceService).Assembly.GetName().Version?.ToString() ?? "0";
        var sb = new System.Text.StringBuilder(version);
        foreach (var b in bundles.OrderBy(b => b.Id, StringComparer.Ordinal))
            sb.Append('|').Append(b.Key).Append('@').Append(b.Version).Append(':').Append(b.Hash).Append(':').Append(b.Meta);
        var hash = System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(sb.ToString()));
        return Convert.ToHexString(hash)[..16];
    }

    private async Task<IReadOnlyList<string>> MissingCapabilitiesAsync(McpServer mcp, CancellationToken ct)
    {
        var needed = RequiredCapabilities(mcp);
        if (needed.Count == 0) return [];
        var present = (await features.CapabilitiesAsync(ct)).Where(c => c.Present).Select(c => c.Id).ToHashSet();
        return needed.Where(n => !present.Contains(n)).ToList();
    }

    private static IReadOnlyList<string> RequiredCapabilities(McpServer mcp)
    {
        var caps = new List<string>();
        switch (mcp.Command)
        {
            case "uvx": caps.Add("uv"); break;
            case "node":
            case "npx": caps.Add("node"); break;
        }
        if (mcp.Env is not null && mcp.Env.ContainsKey("PLAYWRIGHT_BROWSERS_PATH")) caps.Add("playwright-browsers");
        return caps;
    }

    private static McpServer AnchorSharedPaths(McpServer mcp, string root)
    {
        if (mcp.Env is not { Count: > 0 }) return mcp;
        var env = mcp.Env.ToDictionary(
            kv => kv.Key,
            kv => kv.Value.StartsWith('.') ? Path.GetFullPath(Path.Combine(root, kv.Value)) : kv.Value);
        return mcp with { Env = env };
    }

    public async Task SeedAsync(CancellationToken ct)
    {
        var index = store.ReadIndex();
        if (index.Count == 0) return;

        var existing = await db.Bundles.ToListAsync(ct);
        var byKeyVersion = existing.Where(b => b.Key.Length > 0).ToDictionary(b => (b.Key, b.Version));
        var seen = new HashSet<(string, string)>();

        foreach (var e in index)
        {
            var key = e.Id;
            var version = string.IsNullOrWhiteSpace(e.Version) ? DefaultVersion : e.Version!;
            seen.Add((key, version));
            var meta = JsonSerializer.Serialize(new BundleMeta(e.Members ?? [], e.Entries ?? [], e.Mcp), Json);
            var hash = string.IsNullOrEmpty(e.Archive) ? "" : store.ComputeHash(e.Archive!);

            if (byKeyVersion.TryGetValue((key, version), out var row))
            {
                row.Kind = e.Kind; row.Name = e.Name; row.Description = e.Description; row.Author = e.Author;
                row.Tags = JsonSerializer.Serialize(e.Tags, Json); row.Stars = e.Stars; row.Source = e.Source;
                row.Archive = e.Archive ?? ""; row.Meta = meta; row.Hash = hash;
            }
            else
            {
                db.Bundles.Add(new Bundle
                {
                    Id = version == DefaultVersion ? key : $"{key}@{version}",
                    Kind = e.Kind, Key = key, Version = version, Hash = hash, Name = e.Name,
                    Description = e.Description, Author = e.Author,
                    Tags = JsonSerializer.Serialize(e.Tags, Json), Stars = e.Stars, Source = e.Source,
                    Archive = e.Archive ?? "", Meta = meta,
                });
            }
        }

        var stale = existing.Where(b => b.Key.Length > 0 && !seen.Contains((b.Key, b.Version))).ToList();
        if (stale.Count > 0)
        {
            db.Bundles.RemoveRange(stale);
            var orphanKeys = stale.Select(b => b.Key).Except(seen.Select(s => s.Item1)).ToHashSet();
            var candidates = await db.CatalogItems.Where(c => c.Source == MarketplaceSource && c.Key != "").ToListAsync(ct);
            db.CatalogItems.RemoveRange(candidates.Where(c => orphanKeys.Contains(c.Key)));
        }
        await db.SaveChangesAsync(ct);
    }

    public async Task MaterializeGlobalAsync(string globalRoot, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(globalRoot)) return;

        var bundles = await db.Bundles.Where(b => b.Key != "").ToListAsync(ct);
        var marker = Path.Combine(globalRoot, ".vcc-global-seed");
        var stamp = ComputeSeedStamp(bundles);
        if (File.Exists(marker) && File.ReadAllText(marker) == stamp) return;

        foreach (var bundle in bundles.Where(b => !string.IsNullOrEmpty(b.Archive)))
            resources.Ensure(bundle.Key, bundle.Version, bundle.Archive);

        var latest = bundles.GroupBy(b => b.Key, StringComparer.Ordinal)
            .Select(g => g.OrderByDescending(b => Semver.Key(b.Version)).First());

        var complete = true;
        foreach (var bundle in latest)
        {
            var meta = ParseMeta(bundle.Meta);
            if (meta.Members.Count > 0) { WriteTemplate(globalRoot, bundle, meta.Members); continue; }
            if (!string.IsNullOrEmpty(bundle.Archive) && !store.ExtractInto(bundle.Archive, globalRoot).Success) { complete = false; continue; }
            if (meta.Mcp is not null) MergeMcpServer(globalRoot, AnchorSharedPaths(meta.Mcp, globalRoot));
        }

        Directory.CreateDirectory(globalRoot);
        if (complete) await File.WriteAllTextAsync(marker, stamp, ct);
    }

    public Task<IReadOnlyList<MarketplaceItemDto>> ListAsync(CancellationToken ct)
        => SearchAsync(new MarketplaceQuery(null, null, null, null, int.MaxValue, 0), ct);

    public async Task<IReadOnlyList<MarketplaceItemDto>> SearchAsync(MarketplaceQuery query, CancellationToken ct)
    {
        var all = await db.Bundles.Where(b => b.Key != "").ToListAsync(ct);

        var pins = new Dictionary<string, (string version, bool pinned)>(StringComparer.Ordinal);
        if (!string.IsNullOrEmpty(query.ProjectId))
            foreach (var c in await db.CatalogItems.Where(c => c.ProjectId == query.ProjectId && c.Key != "").ToListAsync(ct))
                pins[c.Key] = (c.Version, c.Pinned);

        var groups = all.GroupBy(b => b.Key, StringComparer.Ordinal).Select(g =>
        {
            var latest = g.OrderByDescending(b => Semver.Key(b.Version)).First();
            var versions = g.Select(b => b.Version).OrderByDescending(Semver.Key).ToList();
            return (latest, versions);
        });

        if (!string.IsNullOrWhiteSpace(query.Kind))
            groups = groups.Where(x => string.Equals(x.latest.Kind, query.Kind, StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(query.Tag))
            groups = groups.Where(x => PackJson.ParseStringList(x.latest.Tags).Any(t => string.Equals(t, query.Tag, StringComparison.OrdinalIgnoreCase)));

        var ranked = groups
            .Select(x => (x.latest, x.versions, score: Score(x.latest, query.Q)))
            .Where(x => string.IsNullOrWhiteSpace(query.Q) || x.score > 0)
            .OrderByDescending(x => x.score).ThenByDescending(x => x.latest.Stars).ThenBy(x => x.latest.Name, StringComparer.Ordinal)
            .Skip(Math.Max(0, query.Offset)).Take(query.Limit <= 0 ? int.MaxValue : query.Limit);

        return ranked.Select(x =>
        {
            pins.TryGetValue(x.latest.Key, out var pin);
            var installed = pins.ContainsKey(x.latest.Key) ? pin.version : null;
            var update = installed is not null && Semver.Compare(x.latest.Version, installed) > 0;
            return ToItem(x.latest, x.versions, installed, pin.pinned, update);
        }).ToList();
    }

    private static int Score(Bundle b, string? q)
    {
        if (string.IsNullOrWhiteSpace(q)) return 0;
        var query = q.Trim().ToLowerInvariant();
        var name = b.Name.ToLowerInvariant();
        if (name == query) return 100;
        if (name.StartsWith(query, StringComparison.Ordinal)) return 80;
        if (name.Contains(query, StringComparison.Ordinal)) return 60;
        if (b.Key.ToLowerInvariant().Contains(query, StringComparison.Ordinal)) return 50;
        if (PackJson.ParseStringList(b.Tags).Any(t => t.ToLowerInvariant().Contains(query, StringComparison.Ordinal))) return 40;
        if (b.Description.ToLowerInvariant().Contains(query, StringComparison.Ordinal)) return 20;
        return 0;
    }

    public async Task<MarketplaceItemDto?> ImportAsync(string source, string kind, string? name, CancellationToken ct)
    {
        var resolvedName = string.IsNullOrWhiteSpace(name) ? DeriveName(source) : name!;
        var files = await fetcher.FetchAsync(kind, resolvedName, source, ct);
        if (files.Count == 0) return null;

        var key = $"{kind}-{resolvedName}";
        var archiveFile = $"{key}.tar.gz";
        var entries = await store.WriteArchiveAsync(archiveFile, files, ct);
        var meta = new BundleMeta([], entries, null);

        var bundle = await db.Bundles.FirstOrDefaultAsync(b => b.Key == key && b.Version == DefaultVersion, ct);
        if (bundle is null)
        {
            bundle = new Bundle { Id = key, Key = key, Version = DefaultVersion, Kind = kind, Name = resolvedName };
            db.Bundles.Add(bundle);
        }
        bundle.Kind = kind; bundle.Name = resolvedName; bundle.Source = source;
        bundle.Description = string.IsNullOrEmpty(bundle.Description) ? $"Imported from {source}" : bundle.Description;
        bundle.Author = string.IsNullOrEmpty(bundle.Author) ? DeriveOwner(source) : bundle.Author;
        bundle.Archive = archiveFile;
        bundle.Hash = store.ComputeHash(archiveFile);
        bundle.Meta = JsonSerializer.Serialize(meta, Json);
        await db.SaveChangesAsync(ct);
        return ToItem(bundle, [bundle.Version], null, false, false);
    }

    public async Task<InstallOutcome> InstallAsync(string projectId, string[] ids, CancellationToken ct)
    {
        var project = await projects.Projects.FirstOrDefaultAsync(p => p.Id == projectId, ct);
        if (project is null || string.IsNullOrEmpty(project.Root))
            return new InstallOutcome([], ids.Select(id => new InstallFailure(id, "project not found or has no root")).ToList());

        var installed = new List<string>();
        var failed = new List<InstallFailure>();
        var visited = new HashSet<string>();
        var queue = new Queue<string>(ids);

        while (queue.Count > 0)
        {
            var raw = queue.Dequeue();
            if (!visited.Add(raw)) continue;
            var (key, requestedVersion) = ParseRef(raw);

            var bundle = await ResolveBundleAsync(key, requestedVersion, ct);
            if (bundle is null) { failed.Add(new InstallFailure(raw, "bundle not found in catalog")); continue; }
            var meta = ParseMeta(bundle.Meta);
            var pinned = requestedVersion is not null;

            if (meta.Members.Count > 0)
            {
                WriteTemplate(project.Root, bundle, meta.Members);
                installed.Add($"{bundle.Name} (template)");
                foreach (var m in meta.Members) queue.Enqueue(m);
                continue;
            }

            if (meta.Mcp is not null)
            {
                var missing = await MissingCapabilitiesAsync(meta.Mcp, ct);
                if (missing.Count > 0)
                {
                    failed.Add(new InstallFailure(raw, $"needs {string.Join(", ", missing)} — not installed on this device"));
                    continue;
                }
                if (!string.IsNullOrEmpty(bundle.Archive))
                {
                    var extracted = store.ExtractInto(bundle.Archive, project.Root);
                    if (!extracted.Success) { failed.Add(new InstallFailure(raw, extracted.Error ?? "extraction failed")); continue; }
                }
                MergeMcpServer(project.Root, AnchorSharedPaths(meta.Mcp, GlobalRoot));
                await RecordCatalogItemAsync(projectId, bundle, pinned, ct);
                installed.Add(bundle.Name);
                continue;
            }

            if (string.IsNullOrEmpty(bundle.Archive) && !string.IsNullOrEmpty(bundle.Source))
                await MaterializeAsync(bundle, meta, ct);

            if (string.IsNullOrEmpty(bundle.Archive))
            {
                failed.Add(new InstallFailure(raw, "no content available (archive missing and source unreachable)"));
                continue;
            }

            var result = store.ExtractInto(bundle.Archive, project.Root);
            if (!result.Success) { failed.Add(new InstallFailure(raw, result.Error ?? "extraction failed")); continue; }
            await RecordCatalogItemAsync(projectId, bundle, pinned, ct);
            installed.Add(bundle.Name);
        }

        await db.SaveChangesAsync(ct);
        return new InstallOutcome(installed, failed);
    }

    public async Task<string?> PinAsync(string projectId, string key, string? version, CancellationToken ct)
    {
        var bundle = await ResolveBundleAsync(key, version, ct);
        if (bundle is null) return null;
        var project = await projects.Projects.FirstOrDefaultAsync(p => p.Id == projectId, ct);
        if (project is not null && !string.IsNullOrEmpty(project.Root) && !string.IsNullOrEmpty(bundle.Archive))
            store.ExtractInto(bundle.Archive, project.Root);
        await RecordCatalogItemAsync(projectId, bundle, pinned: true, ct);
        await db.SaveChangesAsync(ct);
        return bundle.Version;
    }

    public async Task<bool> UnpinAsync(string projectId, string key, CancellationToken ct)
    {
        var item = await db.CatalogItems.FirstOrDefaultAsync(c => c.ProjectId == projectId && c.Key == key, ct);
        if (item is null) return false;
        item.Pinned = false;
        await db.SaveChangesAsync(ct);
        return true;
    }

    private async Task<Bundle?> ResolveBundleAsync(string key, string? version, CancellationToken ct)
    {
        var rows = await db.Bundles.Where(b => b.Key == key || b.Name == key).ToListAsync(ct);
        if (rows.Count == 0) return null;
        if (version is not null) return rows.FirstOrDefault(b => b.Version == version);
        return rows.OrderByDescending(b => Semver.Key(b.Version)).First();
    }

    private static (string key, string? version) ParseRef(string reference)
    {
        var at = reference.LastIndexOf('@');
        return at > 0 ? (reference[..at], reference[(at + 1)..]) : (reference, null);
    }

    private async Task MaterializeAsync(Bundle bundle, BundleMeta meta, CancellationToken ct)
    {
        var files = await fetcher.FetchAsync(bundle.Kind, bundle.Name, bundle.Source, ct);
        if (files.Count == 0) return;
        var archiveFile = $"{bundle.Key}.tar.gz";
        var entries = await store.WriteArchiveAsync(archiveFile, files, ct);
        bundle.Archive = archiveFile;
        bundle.Hash = store.ComputeHash(archiveFile);
        bundle.Meta = JsonSerializer.Serialize(meta with { Entries = entries }, Json);
    }

    private async Task RecordCatalogItemAsync(string projectId, Bundle bundle, bool pinned, CancellationToken ct)
    {
        var item = await db.CatalogItems.FirstOrDefaultAsync(c => c.ProjectId == projectId && c.Kind == bundle.Kind && c.Key == bundle.Key, ct);
        if (item is null)
        {
            item = new CatalogItem { Kind = bundle.Kind, Key = bundle.Key, Scope = MarketplaceScope, Source = MarketplaceSource, ProjectId = projectId };
            db.CatalogItems.Add(item);
        }
        item.Name = bundle.Name;
        item.Version = bundle.Version;
        item.Pinned = pinned;
        item.Meta = JsonSerializer.Serialize(new { bundle.Author, bundle.Source }, Json);
    }

    private MarketplaceItemDto ToItem(Bundle bundle, IReadOnlyList<string> versions, string? installedVersion, bool pinned, bool updateAvailable)
    {
        var meta = ParseMeta(bundle.Meta);
        return new MarketplaceItemDto(bundle.Key, bundle.Kind, bundle.Name, bundle.Version, versions, bundle.Description, bundle.Author,
            PackJson.ParseStringList(bundle.Tags), bundle.Stars, bundle.Source, bundle.Key, meta.Members, ContentFor(bundle, meta),
            installedVersion, pinned, updateAvailable);
    }

    private string ContentFor(Bundle bundle, BundleMeta meta)
    {
        if (meta.Mcp is not null)
        {
            object entry = meta.Mcp.Env is { Count: > 0 }
                ? new { command = meta.Mcp.Command, args = meta.Mcp.Args, env = meta.Mcp.Env }
                : new { command = meta.Mcp.Command, args = meta.Mcp.Args };
            return JsonSerializer.Serialize(new { mcpServers = new Dictionary<string, object> { [meta.Mcp.Name] = entry } }, new JsonSerializerOptions(Json) { WriteIndented = true });
        }
        if (!string.IsNullOrEmpty(bundle.Archive))
            return store.PrimaryContent(bundle.Archive, meta.Entries.FirstOrDefault());
        if (meta.Members.Count > 0)
            return TemplateMarkdown(bundle, meta.Members);
        return "";
    }

    private static void WriteTemplate(string root, Bundle bundle, IReadOnlyList<string> members)
    {
        var file = Path.Combine(root, ".claude", "templates", $"{bundle.Name}.md");
        Directory.CreateDirectory(Path.GetDirectoryName(file)!);
        File.WriteAllText(file, TemplateMarkdown(bundle, members));
    }

    private static string TemplateMarkdown(Bundle bundle, IReadOnlyList<string> members)
        => $"# {bundle.Name}\n\n{bundle.Description}\n\n## Includes\n" + string.Join("\n", members.Select(m => $"- {m}")) + "\n";

    private static void MergeMcpServer(string root, McpServer mcp)
    {
        var file = Path.Combine(root, ".mcp.json");
        Dictionary<string, JsonElement> config = new();
        try
        {
            if (File.Exists(file))
                config = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(File.ReadAllText(file), Json) ?? new();
        }
        catch { config = new(); }

        var servers = new Dictionary<string, object>();
        if (config.TryGetValue("mcpServers", out var existing) && existing.ValueKind == JsonValueKind.Object)
            foreach (var p in existing.EnumerateObject()) servers[p.Name] = p.Value;
        servers[mcp.Name] = mcp.Env is { Count: > 0 }
            ? new { command = mcp.Command, args = mcp.Args, env = mcp.Env }
            : new { command = mcp.Command, args = mcp.Args };

        var merged = new Dictionary<string, object>();
        foreach (var kv in config) if (kv.Key != "mcpServers") merged[kv.Key] = kv.Value;
        merged["mcpServers"] = servers;

        Directory.CreateDirectory(Path.GetDirectoryName(file)!);
        File.WriteAllText(file, JsonSerializer.Serialize(merged, new JsonSerializerOptions(Json) { WriteIndented = true }));
    }

    private static string DeriveName(string source)
    {
        var trimmed = source.TrimEnd('/');
        var leaf = trimmed[(trimmed.LastIndexOf('/') + 1)..];
        return leaf.Replace(".git", "").Length > 0 ? leaf.Replace(".git", "") : "package";
    }

    private static string DeriveOwner(string source)
    {
        var m = System.Text.RegularExpressions.Regex.Match(source, @"github\.com/([^/#?]+)/", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        return m.Success ? m.Groups[1].Value : "";
    }

    private static BundleMeta ParseMeta(string json)
    {
        try { return JsonSerializer.Deserialize<BundleMeta>(string.IsNullOrEmpty(json) ? "{}" : json, Json) ?? new BundleMeta([], [], null); }
        catch { return new BundleMeta([], [], null); }
    }
}
