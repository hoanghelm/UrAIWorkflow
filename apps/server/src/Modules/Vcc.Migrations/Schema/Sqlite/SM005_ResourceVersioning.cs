using Vcc.Migrations.Abstractions;

namespace Vcc.Migrations.Schema.Sqlite;

public sealed class SM005_ResourceVersioning : ISchemaMigration
{
    public int Version => 5;
    public DbProvider Provider => DbProvider.Sqlite;

    public void Migrate(SchemaContext ctx)
    {
        ctx.Execute(@"ALTER TABLE ""Bundles"" ADD COLUMN ""Key"" TEXT NOT NULL DEFAULT '';");
        ctx.Execute(@"ALTER TABLE ""Bundles"" ADD COLUMN ""Version"" TEXT NOT NULL DEFAULT '1.0.0';");
        ctx.Execute(@"ALTER TABLE ""Bundles"" ADD COLUMN ""Hash"" TEXT NOT NULL DEFAULT '';");
        ctx.Execute(@"UPDATE ""Bundles"" SET ""Key"" = ""Id"" WHERE ""Key"" = '';");
        ctx.Execute(@"CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Bundles_Key_Version"" ON ""Bundles"" (""Key"", ""Version"");");
        ctx.Execute(@"ALTER TABLE ""CatalogItems"" ADD COLUMN ""Key"" TEXT NOT NULL DEFAULT '';");
        ctx.Execute(@"ALTER TABLE ""CatalogItems"" ADD COLUMN ""Pinned"" INTEGER NOT NULL DEFAULT 0;");
        ctx.Execute(@"ALTER TABLE ""Runs"" ADD COLUMN ""Snapshot"" TEXT NOT NULL DEFAULT '';");
    }
}
