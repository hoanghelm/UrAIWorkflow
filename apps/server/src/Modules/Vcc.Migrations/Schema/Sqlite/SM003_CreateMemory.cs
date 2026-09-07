using Vcc.Migrations.Abstractions;

namespace Vcc.Migrations.Schema.Sqlite;

public sealed class SM003_CreateMemory : ISchemaMigration
{
    public int Version => 3;
    public DbProvider Provider => DbProvider.Sqlite;

    public void Migrate(SchemaContext ctx)
    {
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""MemoryEntries"" (""Id"" TEXT PRIMARY KEY, ""ProjectId"" TEXT NOT NULL, ""Scope"" TEXT NOT NULL, ""Key"" TEXT NOT NULL, ""Content"" TEXT NOT NULL, ""CreatedAt"" TEXT NOT NULL, ""UpdatedAt"" TEXT NOT NULL, UNIQUE(""ProjectId"", ""Scope"", ""Key""));");
        ctx.Execute(@"CREATE INDEX IF NOT EXISTS ""IX_MemoryEntries_Project"" ON ""MemoryEntries"" (""ProjectId"", ""Scope"");");
    }
}
