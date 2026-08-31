using Vcc.Migrations.Abstractions;

namespace Vcc.Migrations.Data;

// Marketplace bundles are seeded at startup from data/bundles/index.json
// (real content, stored as gzip archives) by MarketplaceService.SeedAsync.
public sealed class DM001_SeedMarketplace : IDataMigration
{
    public int Version => 1;

    public Task MigrateAsync(DataContext ctx, CancellationToken ct) => Task.CompletedTask;
}
