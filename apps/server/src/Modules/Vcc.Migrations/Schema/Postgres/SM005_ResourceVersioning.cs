using Vcc.Migrations.Abstractions;

namespace Vcc.Migrations.Schema.Postgres;

public sealed class SM005_ResourceVersioning : ISchemaMigration
{
    public int Version => 5;
    public DbProvider Provider => DbProvider.Postgres;

    public void Migrate(SchemaContext ctx)
    {
        ctx.Execute(@"ALTER TABLE ""Bundles"" ADD COLUMN IF NOT EXISTS ""Key"" TEXT NOT NULL DEFAULT '';");
        ctx.Execute(@"ALTER TABLE ""Bundles"" ADD COLUMN IF NOT EXISTS ""Version"" TEXT NOT NULL DEFAULT '1.0.0';");
        ctx.Execute(@"ALTER TABLE ""Bundles"" ADD COLUMN IF NOT EXISTS ""Hash"" TEXT NOT NULL DEFAULT '';");
        ctx.Execute(@"UPDATE ""Bundles"" SET ""Key"" = ""Id"" WHERE ""Key"" = '';");
        ctx.Execute(@"CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Bundles_Key_Version"" ON ""Bundles"" (""Key"", ""Version"");");
        ctx.Execute(@"ALTER TABLE ""CatalogItems"" ADD COLUMN IF NOT EXISTS ""Key"" TEXT NOT NULL DEFAULT '';");
        ctx.Execute(@"ALTER TABLE ""CatalogItems"" ADD COLUMN IF NOT EXISTS ""Pinned"" BOOLEAN NOT NULL DEFAULT FALSE;");
        ctx.Execute(@"ALTER TABLE ""Runs"" ADD COLUMN IF NOT EXISTS ""Snapshot"" TEXT NOT NULL DEFAULT '';");
    }
}
