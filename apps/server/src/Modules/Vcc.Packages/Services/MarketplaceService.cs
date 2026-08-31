using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;
using Vcc.Packages.Bundles;
using Vcc.Packages.Common;
using Vcc.Packages.Contracts;

namespace Vcc.Packages.Services;

public sealed class MarketplaceService(IPackageDbContext db, IProjectDbContext projects, IBundleStore store) : IMarketplaceService
{
    private const string MarketplaceScope = "project";
    private const string MarketplaceSource = "marketplace";
    private static readonly JsonSerializerOptions Json = PackJson.Options;

    public async Task SeedAsync(CancellationToken ct)
    {
        var index = store.ReadIndex();
        if (index.Count == 0) return;

        var existing = await db.Bundles.ToListAsync(ct);
        var byId = existing.ToDictionary(b => b.Id);

        foreach (var e in index)
        {
            var meta = JsonSerializer.Serialize(new BundleMeta(e.Members ?? [], e.Entries ?? [], e.Mcp), Json);
            if (byId.TryGetValue(e.Id, out var row))
            {
                row.Kind = e.Kind; row.Name = e.Name; row.Description = e.Description; row.Author = e.Author;
                row.Tags = JsonSerializer.Serialize(e.Tags, Json); row.Stars = e.Stars; row.Source = e.Source;
                row.Archive = e.Archive ?? ""; row.Meta = meta;
            }
            else
            {
                db.Bundles.Add(new Bundle
                {
                    Id = e.Id, Kind = e.Kind, Name = e.Name, Description = e.Description, Author = e.Author,
                    Tags = JsonSerializer.Serialize(e.Tags, Json), Stars = e.Stars, Source = e.Source,
                    Archive = e.Archive ?? "", Meta = meta,
                });
            }
        }

        var indexIds = index.Select(e => e.Id).ToHashSet();
        db.Bundles.RemoveRange(existing.Where(b => !indexIds.Contains(b.Id)));
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<MarketplaceItemDto>> ListAsync(CancellationToken ct)
    {
        var bundles = await db.Bundles.OrderByDescending(b => b.Stars).ToListAsync(ct);
        return bundles.Select(b =>
        {
            var meta = ParseMeta(b.Meta);
            var content = ContentFor(b, meta);
            return new MarketplaceItemDto(
                b.Id, b.Kind, b.Name, b.Description, b.Author, PackJson.ParseStringList(b.Tags),
                b.Stars, b.Source, b.Name, meta.Members, content);
        }).ToList();
    }

    public async Task<IReadOnlyList<string>> InstallAsync(string projectId, string[] ids, CancellationToken ct)
    {
        var project = await projects.Projects.FirstOrDefaultAsync(p => p.Id == projectId, ct);
        if (project is null || string.IsNullOrEmpty(project.Root)) return [];

        var installed = new List<string>();
        var visited = new HashSet<string>();
        var queue = new Queue<string>(ids);

        while (queue.Count > 0)
        {
            var id = queue.Dequeue();
            if (!visited.Add(id)) continue;

            var bundle = await db.Bundles.FirstOrDefaultAsync(b => b.Id == id || b.Name == id, ct);
            if (bundle is null) continue;
            var meta = ParseMeta(bundle.Meta);

            if (meta.Members.Count > 0)
            {
                WriteTemplate(project.Root, bundle, meta.Members);
                installed.Add($"{bundle.Name} (template)");
                foreach (var m in meta.Members) queue.Enqueue(m);
                continue;
            }

            if (meta.Mcp is not null)
            {
                MergeMcpServer(project.Root, meta.Mcp);
                installed.Add(bundle.Name);
                continue;
            }

            if (!string.IsNullOrEmpty(bundle.Archive) && store.ExtractInto(bundle.Archive, project.Root))
            {
                await RecordCatalogItemAsync(projectId, bundle, ct);
                installed.Add(bundle.Name);
            }
        }

        await db.SaveChangesAsync(ct);
        return installed;
    }

    private async Task RecordCatalogItemAsync(string projectId, Bundle bundle, CancellationToken ct)
    {
        var exists = await db.CatalogItems.AnyAsync(c => c.ProjectId == projectId && c.Name == bundle.Name && c.Kind == bundle.Kind, ct);
        if (exists) return;
        db.CatalogItems.Add(new CatalogItem
        {
            Kind = bundle.Kind, Name = bundle.Name, Scope = MarketplaceScope, Source = MarketplaceSource,
            ProjectId = projectId, Meta = JsonSerializer.Serialize(new { bundle.Author, bundle.Source }, Json),
        });
    }

    private string ContentFor(Bundle bundle, BundleMeta meta)
    {
        if (!string.IsNullOrEmpty(bundle.Archive))
            return store.PrimaryContent(bundle.Archive, meta.Entries.FirstOrDefault());
        if (meta.Mcp is not null)
            return JsonSerializer.Serialize(new { mcpServers = new Dictionary<string, object> { [meta.Mcp.Name] = new { command = meta.Mcp.Command, args = meta.Mcp.Args } } }, new JsonSerializerOptions(Json) { WriteIndented = true });
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
        servers[mcp.Name] = new { command = mcp.Command, args = mcp.Args };

        var merged = new Dictionary<string, object>();
        foreach (var kv in config) if (kv.Key != "mcpServers") merged[kv.Key] = kv.Value;
        merged["mcpServers"] = servers;

        Directory.CreateDirectory(Path.GetDirectoryName(file)!);
        File.WriteAllText(file, JsonSerializer.Serialize(merged, new JsonSerializerOptions(Json) { WriteIndented = true }));
    }

    private static BundleMeta ParseMeta(string json)
    {
        try { return JsonSerializer.Deserialize<BundleMeta>(string.IsNullOrEmpty(json) ? "{}" : json, Json) ?? new BundleMeta([], [], null); }
        catch { return new BundleMeta([], [], null); }
    }
}
