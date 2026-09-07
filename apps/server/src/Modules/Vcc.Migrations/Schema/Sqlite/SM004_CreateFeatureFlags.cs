using Vcc.Migrations.Abstractions;

namespace Vcc.Migrations.Schema.Sqlite;

public sealed class SM004_CreateFeatureFlags : ISchemaMigration
{
    public int Version => 4;
    public DbProvider Provider => DbProvider.Sqlite;

    public void Migrate(SchemaContext ctx)
    {
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""FeatureFlags"" (""Id"" TEXT PRIMARY KEY, ""Key"" TEXT NOT NULL UNIQUE, ""Enabled"" INTEGER NOT NULL, ""UpdatedAt"" TEXT NOT NULL);");
    }
}
