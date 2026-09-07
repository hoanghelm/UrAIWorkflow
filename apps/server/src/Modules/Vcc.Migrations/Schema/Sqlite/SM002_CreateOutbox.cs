using Vcc.Migrations.Abstractions;

namespace Vcc.Migrations.Schema.Sqlite;

public sealed class SM002_CreateOutbox : ISchemaMigration
{
    public int Version => 2;
    public DbProvider Provider => DbProvider.Sqlite;

    public void Migrate(SchemaContext ctx)
    {
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""OutboxMessages"" (""Id"" TEXT PRIMARY KEY, ""RunId"" TEXT NOT NULL, ""Kind"" TEXT NOT NULL, ""Attempts"" INTEGER NOT NULL, ""ProcessedAt"" TEXT NULL, ""NotBefore"" TEXT NOT NULL, ""Error"" TEXT NULL, ""CreatedAt"" TEXT NOT NULL);");
        ctx.Execute(@"CREATE INDEX IF NOT EXISTS ""IX_OutboxMessages_Pending"" ON ""OutboxMessages"" (""ProcessedAt"", ""NotBefore"");");
    }
}
