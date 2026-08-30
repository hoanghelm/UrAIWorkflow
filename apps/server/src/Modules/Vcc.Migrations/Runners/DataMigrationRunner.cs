using Dapper;
using Microsoft.Extensions.Logging;
using SqlKata.Execution;
using Vcc.Migrations.Abstractions;

namespace Vcc.Migrations.Runners;

public sealed class DataMigrationRunner(
    IEnumerable<IDataMigration> migrations,
    MigrationConnectionFactory factory,
    IServiceProvider services,
    ILogger<DataMigrationRunner> logger)
{
    public async Task RunAsync(CancellationToken ct = default)
    {
        using var conn = factory.Open();
        await conn.ExecuteAsync(@"CREATE TABLE IF NOT EXISTS ""__vcc_data_migrations"" (
            ""Version"" INTEGER PRIMARY KEY, ""Name"" TEXT NOT NULL, ""ExecutedAt"" TEXT NOT NULL);");

        using var db = new QueryFactory(conn, factory.CreateCompiler());
        var ctx = new DataContext(db, factory.Provider, services);

        var pending = migrations.OrderBy(m => m.Version).ToList();
        var applied = 0;
        foreach (var migration in pending)
        {
            var has = await conn.ExecuteScalarAsync<int>(
                @"SELECT COUNT(*) FROM ""__vcc_data_migrations"" WHERE ""Version"" = @v", new { v = migration.Version });
            if (has > 0) continue;

            await migration.MigrateAsync(ctx, ct);
            await conn.ExecuteAsync(
                @"INSERT INTO ""__vcc_data_migrations"" (""Version"", ""Name"", ""ExecutedAt"") VALUES (@v, @n, @a)",
                new { v = migration.Version, n = migration.GetType().Name, a = DateTimeOffset.UtcNow.ToString("O") });
            applied++;
            logger.LogInformation("data v{Version} {Name} executed", migration.Version, migration.GetType().Name);
        }
        logger.LogInformation("data migrations complete ({Applied} executed)", applied);
    }
}
