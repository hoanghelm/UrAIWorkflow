using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;
using Vcc.Packages.Common;
using Vcc.Packages.Contracts;

namespace Vcc.Packages.Services;

public sealed class PackService(IPackageDbContext db, IProjectDbContext projects) : IPackService
{
    private const string PacksFile = "packs.json";
    private const string DefaultTrust = "community";
    private const string DefaultVersion = "0.1.0";

    public async Task SeedAsync(CancellationToken ct)
    {
        var file = PackJson.DataFile(PacksFile);
        if (!File.Exists(file)) return;
        using var doc = JsonDocument.Parse(await File.ReadAllTextAsync(file, ct));
        foreach (var manifest in doc.RootElement.EnumerateArray())
        {
            var name = PackJson.Str(manifest, "name");
            var version = PackJson.Str(manifest, "version", DefaultVersion);
            if (name.Length == 0) continue;
            var raw = manifest.GetRawText();
            var existing = await db.Packs.FirstOrDefaultAsync(p => p.Name == name && p.Version == version, ct);
            if (existing is null)
            {
                db.Packs.Add(new Pack
                {
                    Name = name, Version = version,
                    Description = PackJson.Str(manifest, "description"),
                    Trust = PackJson.Str(manifest, "trust", DefaultTrust),
                    Manifest = raw, Installed = true,
                });
            }
            else { existing.Description = PackJson.Str(manifest, "description"); existing.Trust = PackJson.Str(manifest, "trust", DefaultTrust); existing.Manifest = raw; }
        }
        await db.SaveChangesAsync(ct);
    }

    private static PackSummaryDto ToSummary(Pack p)
    {
        var manifest = JsonSerializer.Deserialize<JsonElement>(string.IsNullOrEmpty(p.Manifest) ? "{}" : p.Manifest, PackJson.Options);
        var title = PackJson.Str(manifest, "title");
        return new PackSummaryDto(p.Id, p.Name, title.Length > 0 ? title : p.Name, p.Version, p.Description,
            PackJson.StrArray(manifest, "roles"), PackJson.StrArray(manifest, "tags"), p.Trust, p.Installed);
    }

    public async Task<IReadOnlyList<PackSummaryDto>> ListAsync(CancellationToken ct)
        => (await db.Packs.OrderBy(p => p.Name).ToListAsync(ct)).Select(ToSummary).ToList();

    public async Task<IReadOnlyList<ProjectPackSummaryDto>> ListForProjectAsync(string projectId, CancellationToken ct)
    {
        var rows = await db.Packs.OrderBy(p => p.Name).ToListAsync(ct);
        var pins = await projects.ProjectPacks.Where(p => p.ProjectId == projectId).ToListAsync(ct);
        var pinBy = pins.ToDictionary(p => p.PackName, p => p.InstalledVersion);

        var latest = rows.GroupBy(r => r.Name)
            .Select(g => g.OrderByDescending(r => Semver.Key(r.Version)).First());

        return latest.Select(row =>
        {
            var s = ToSummary(row);
            var installedVersion = pinBy.TryGetValue(row.Name, out var iv) ? iv : null;
            var update = installedVersion is not null && Semver.Compare(row.Version, installedVersion) > 0;
            return new ProjectPackSummaryDto(s.Id, s.Name, s.Title, s.Version, s.Description, s.Roles, s.Tags, s.Trust,
                installedVersion is not null, installedVersion, row.Version, update);
        }).ToList();
    }

    public async Task<JsonElement?> GetManifestAsync(string name, CancellationToken ct)
    {
        var rows = await db.Packs.Where(p => p.Name == name).ToListAsync(ct);
        if (rows.Count == 0) return null;
        var latest = rows.OrderByDescending(r => Semver.Key(r.Version)).First();
        return JsonSerializer.Deserialize<JsonElement>(latest.Manifest, PackJson.Options);
    }

    public async Task<(string packName, string installedVersion)?> InstallAsync(string name, string projectId, CancellationToken ct)
    {
        var rows = await db.Packs.Where(p => p.Name == name).ToListAsync(ct);
        if (rows.Count == 0) return null;
        var version = rows.OrderByDescending(r => Semver.Key(r.Version)).First().Version;
        var existing = await projects.ProjectPacks.FirstOrDefaultAsync(p => p.ProjectId == projectId && p.PackName == name, ct);
        if (existing is null)
            projects.ProjectPacks.Add(new ProjectPack { ProjectId = projectId, PackName = name, InstalledVersion = version });
        else { existing.InstalledVersion = version; existing.UpdatedAt = DateTime.UtcNow; }
        await projects.SaveChangesAsync(ct);
        return (name, version);
    }

    public async Task<string> UninstallAsync(string name, string projectId, CancellationToken ct)
    {
        var pins = await projects.ProjectPacks.Where(p => p.ProjectId == projectId && p.PackName == name).ToListAsync(ct);
        projects.ProjectPacks.RemoveRange(pins);
        await projects.SaveChangesAsync(ct);
        return name;
    }
}
