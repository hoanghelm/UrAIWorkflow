using Dapper;
using Microsoft.Extensions.Logging;
using Vcc.Migrations.Abstractions;

namespace Vcc.Migrations.Runners;

public sealed class SchemaMigrationRunner(
    IEnumerable<ISchemaMigration> migrations,
    MigrationConnectionFactory factory,
    ILogger<SchemaMigrationRunner> logger)
{
    public async Task RunAsync(CancellationToken ct = default)
    {
        using var conn = factory.Open();
        await conn.ExecuteAsync(@"CREATE TABLE IF NOT EXISTS ""__vcc_schema_migrations"" (
            ""Version"" INTEGER PRIMARY KEY, ""Name"" TEXT NOT NULL, ""AppliedAt"" TEXT NOT NULL);");

        var pending = migrations.Where(m => m.Provider == factory.Provider).OrderBy(m => m.Version).ToList();
        var applied = 0;
        foreach (var migration in pending)
        {
            var has = await conn.ExecuteScalarAsync<int>(
                @"SELECT COUNT(*) FROM ""__vcc_schema_migrations"" WHERE ""Version"" = @v", new { v = migration.Version });
            if (has > 0) continue;

            var ctx = new SchemaContext();
            migration.Migrate(ctx);
            foreach (var sql in ctx.Statements) await conn.ExecuteAsync(sql);
            await conn.ExecuteAsync(
                @"INSERT INTO ""__vcc_schema_migrations"" (""Version"", ""Name"", ""AppliedAt"") VALUES (@v, @n, @a)",
                new { v = migration.Version, n = migration.GetType().Name, a = DateTimeOffset.UtcNow.ToString("O") });
            applied++;
            logger.LogInformation("schema v{Version} {Name} applied", migration.Version, migration.GetType().Name);
        }
        logger.LogInformation("schema migrations complete ({Applied} applied, provider={Provider})", applied, factory.Provider);
    }
}
