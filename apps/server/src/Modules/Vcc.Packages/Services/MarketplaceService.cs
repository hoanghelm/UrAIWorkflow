using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;
using Vcc.Packages.Common;
using Vcc.Packages.Contracts;

namespace Vcc.Packages.Services;

public sealed class MarketplaceService(IPackageDbContext db) : IMarketplaceService
{
    private const string MarketplaceScope = "project";
    private const string MarketplaceSource = "marketplace";

    public async Task<IReadOnlyList<MarketplaceItemDto>> ListAsync(CancellationToken ct)
    {
        var bundles = await db.Bundles.OrderByDescending(b => b.Stars).ToListAsync(ct);
        return bundles.Select(b => new MarketplaceItemDto(
            b.Id, b.Kind, b.Name, b.Description, b.Author, PackJson.ParseStringList(b.Tags),
            b.Stars, b.Source, "", [], "")).ToList();
    }

    public async Task<IReadOnlyList<string>> InstallAsync(string projectId, string[] ids, CancellationToken ct)
    {
        var installed = new List<string>();
        foreach (var id in ids)
        {
            var bundle = await db.Bundles.FirstOrDefaultAsync(b => b.Id == id || b.Name == id, ct);
            if (bundle is null) continue;
            var exists = await db.CatalogItems.AnyAsync(c => c.ProjectId == projectId && c.Name == bundle.Name && c.Kind == bundle.Kind, ct);
            if (!exists)
            {
                db.CatalogItems.Add(new CatalogItem
                {
                    Kind = bundle.Kind, Name = bundle.Name, Scope = MarketplaceScope, Source = MarketplaceSource,
                    ProjectId = projectId, Meta = JsonSerializer.Serialize(new { bundle.Author, bundle.Source }, PackJson.Options),
                });
            }
            installed.Add(bundle.Id);
        }
        await db.SaveChangesAsync(ct);
        return installed;
    }
}
