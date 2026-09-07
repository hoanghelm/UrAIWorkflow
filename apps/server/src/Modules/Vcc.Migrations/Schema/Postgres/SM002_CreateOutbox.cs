using Vcc.Migrations.Abstractions;

namespace Vcc.Migrations.Schema.Postgres;

public sealed class SM002_CreateOutbox : ISchemaMigration
{
    public int Version => 2;
    public DbProvider Provider => DbProvider.Postgres;

    public void Migrate(SchemaContext ctx)
    {
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""OutboxMessages"" (""Id"" TEXT PRIMARY KEY, ""RunId"" TEXT NOT NULL, ""Kind"" TEXT NOT NULL, ""Attempts"" INTEGER NOT NULL, ""ProcessedAt"" TIMESTAMPTZ NULL, ""NotBefore"" TIMESTAMPTZ NOT NULL, ""Error"" TEXT NULL, ""CreatedAt"" TIMESTAMPTZ NOT NULL);");
        ctx.Execute(@"CREATE INDEX IF NOT EXISTS ""IX_OutboxMessages_Pending"" ON ""OutboxMessages"" (""ProcessedAt"", ""NotBefore"");");
    }
}
