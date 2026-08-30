using SqlKata.Execution;
using Vcc.Migrations.Abstractions;

namespace Vcc.Migrations.Data;

public sealed class DM001_SeedMarketplace : IDataMigration
{
    public int Version => 1;

    public async Task MigrateAsync(DataContext ctx, CancellationToken ct)
    {
        var count = await ctx.Db.Query("Bundles").CountAsync<int>();
        if (count > 0) return;

        await ctx.Db.Query("Bundles").InsertAsync(new
        {
            Id = "skill-ponytail",
            Kind = "skill",
            Name = "ponytail",
            Description = "Lazy senior dev mode: YAGNI, stdlib first, no unrequested abstractions.",
            Author = "DietrichGebert",
            Tags = "[\"tokens\",\"codegen\"]",
            Stars = 74000,
            Source = "https://github.com/DietrichGebert/ponytail",
            Archive = "",
            Meta = "{}"
        });
    }
}
