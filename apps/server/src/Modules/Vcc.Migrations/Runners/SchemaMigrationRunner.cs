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

        var ordered = migrations.Where(m => m.Provider == factory.Provider).OrderBy(m => m.Version).ToList();
        var appliedVersions = (await conn.QueryAsync<int>(@"SELECT ""Version"" FROM ""__vcc_schema_migrations""")).ToHashSet();
        var pending = ordered.Where(m => !appliedVersions.Contains(m.Version)).ToList();

        if (pending.Count > 0) BackupBeforeMigrate(conn, pending);

        var applied = 0;
        foreach (var migration in pending)
        {
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

    private void BackupBeforeMigrate(System.Data.IDbConnection conn, IReadOnlyList<ISchemaMigration> pending)
    {
        var dbPath = factory.SqliteDataSource;
        if (dbPath is null || !File.Exists(dbPath)) return;

        try
        {
            conn.Execute("PRAGMA wal_checkpoint(TRUNCATE);");
            var stamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
            var target = $"{dbPath}.bak-{stamp}";
            File.Copy(dbPath, target, overwrite: true);
            logger.LogInformation("backed up database to {Backup} before applying {Count} migration(s)", target, pending.Count);
            PruneBackups(dbPath, keep: 5);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "database backup before migration failed; continuing");
        }
    }

    private static void PruneBackups(string dbPath, int keep)
    {
        var dir = Path.GetDirectoryName(dbPath);
        if (string.IsNullOrEmpty(dir)) return;
        var prefix = Path.GetFileName(dbPath) + ".bak-";
        var stale = Directory.EnumerateFiles(dir, prefix + "*")
            .OrderByDescending(f => f, StringComparer.Ordinal)
            .Skip(keep)
            .ToList();
        foreach (var file in stale)
        {
            try { File.Delete(file); } catch { }
        }
    }
}
