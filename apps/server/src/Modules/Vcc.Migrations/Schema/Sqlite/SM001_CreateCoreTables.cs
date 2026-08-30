using Vcc.Migrations.Abstractions;

namespace Vcc.Migrations.Schema.Sqlite;

public sealed class SM001_CreateCoreTables : ISchemaMigration
{
    public int Version => 1;
    public DbProvider Provider => DbProvider.Sqlite;

    public void Migrate(SchemaContext ctx)
    {
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""Projects"" (""Id"" TEXT PRIMARY KEY, ""Name"" TEXT NOT NULL, ""Root"" TEXT NOT NULL UNIQUE, ""Persona"" TEXT NOT NULL, ""CreatedAt"" TEXT NOT NULL);");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""CatalogItems"" (""Id"" TEXT PRIMARY KEY, ""Kind"" TEXT NOT NULL, ""Name"" TEXT NOT NULL, ""Scope"" TEXT NOT NULL, ""Path"" TEXT NULL, ""Trust"" TEXT NOT NULL, ""Version"" TEXT NOT NULL, ""Source"" TEXT NOT NULL, ""Meta"" TEXT NOT NULL, ""ProjectId"" TEXT NULL);");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""Packs"" (""Id"" TEXT PRIMARY KEY, ""Name"" TEXT NOT NULL, ""Version"" TEXT NOT NULL, ""Description"" TEXT NOT NULL, ""Trust"" TEXT NOT NULL, ""Manifest"" TEXT NOT NULL, ""Installed"" INTEGER NOT NULL, ""CreatedAt"" TEXT NOT NULL, UNIQUE(""Name"", ""Version""));");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""Bundles"" (""Id"" TEXT PRIMARY KEY, ""Kind"" TEXT NOT NULL, ""Name"" TEXT NOT NULL, ""Description"" TEXT NOT NULL, ""Author"" TEXT NOT NULL, ""Tags"" TEXT NOT NULL, ""Stars"" INTEGER NOT NULL, ""Source"" TEXT NOT NULL, ""Archive"" TEXT NOT NULL, ""Meta"" TEXT NOT NULL);");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""Runs"" (""Id"" TEXT PRIMARY KEY, ""ProjectId"" TEXT NULL, ""CardId"" TEXT NULL, ""Cwd"" TEXT NULL, ""Kind"" TEXT NOT NULL, ""Name"" TEXT NOT NULL, ""Pack"" TEXT NOT NULL, ""Status"" TEXT NOT NULL, ""Breach"" TEXT NULL, ""Question"" TEXT NULL, ""Workflow"" TEXT NOT NULL, ""TokensConsumed"" INTEGER NOT NULL, ""TokensSaved"" INTEGER NOT NULL, ""TokensInput"" INTEGER NOT NULL, ""TokensOutput"" INTEGER NOT NULL, ""TokensCached"" INTEGER NOT NULL, ""CreatedAt"" TEXT NOT NULL, ""UpdatedAt"" TEXT NOT NULL);");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""Stages"" (""Id"" TEXT PRIMARY KEY, ""RunId"" TEXT NOT NULL, ""StageId"" TEXT NOT NULL, ""Title"" TEXT NOT NULL, ""Agent"" TEXT NOT NULL, ""Model"" TEXT NOT NULL, ""Status"" TEXT NOT NULL, ""Attempts"" INTEGER NOT NULL, ""Tokens"" INTEGER NOT NULL, ""Order"" INTEGER NOT NULL);");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""RunEvents"" (""Id"" TEXT PRIMARY KEY, ""RunId"" TEXT NOT NULL, ""At"" TEXT NOT NULL, ""Level"" TEXT NOT NULL, ""StageId"" TEXT NULL, ""Status"" TEXT NULL, ""StageStatus"" TEXT NULL, ""Breach"" TEXT NULL, ""Message"" TEXT NOT NULL);");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""Checkpoints"" (""Id"" TEXT PRIMARY KEY, ""RunId"" TEXT NOT NULL, ""StageId"" TEXT NOT NULL, ""State"" TEXT NOT NULL, ""CreatedAt"" TEXT NOT NULL);");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""StageLogs"" (""Id"" TEXT PRIMARY KEY, ""RunId"" TEXT NOT NULL, ""StageId"" TEXT NOT NULL, ""Text"" TEXT NOT NULL, ""Trace"" TEXT NOT NULL, ""Tokens"" INTEGER NOT NULL, ""CreatedAt"" TEXT NOT NULL, UNIQUE(""RunId"", ""StageId""));");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""BoardCards"" (""Id"" TEXT PRIMARY KEY, ""ProjectId"" TEXT NOT NULL, ""Title"" TEXT NOT NULL, ""Requirement"" TEXT NOT NULL, ""Type"" TEXT NOT NULL, ""ParentId"" TEXT NULL, ""Pack"" TEXT NOT NULL, ""Model"" TEXT NOT NULL, ""MaxLoops"" INTEGER NOT NULL, ""Status"" TEXT NOT NULL, ""Review"" TEXT NOT NULL, ""RunId"" TEXT NULL, ""Worktree"" TEXT NULL, ""Artifacts"" TEXT NOT NULL, ""Links"" TEXT NOT NULL, ""Labels"" TEXT NOT NULL, ""SprintId"" TEXT NULL, ""Assignee"" TEXT NULL, ""Order"" INTEGER NOT NULL, ""CreatedAt"" TEXT NOT NULL);");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""Artifacts"" (""Id"" TEXT PRIMARY KEY, ""RunId"" TEXT NULL, ""ProjectId"" TEXT NULL, ""CardId"" TEXT NULL, ""Build"" INTEGER NOT NULL, ""Name"" TEXT NOT NULL, ""Path"" TEXT NOT NULL, ""Files"" TEXT NOT NULL, ""SizeBytes"" INTEGER NOT NULL, ""FileCount"" INTEGER NOT NULL, ""Preview"" TEXT NOT NULL, ""CreatedAt"" TEXT NOT NULL);");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""BoardComments"" (""Id"" TEXT PRIMARY KEY, ""CardId"" TEXT NOT NULL, ""Author"" TEXT NOT NULL, ""Kind"" TEXT NOT NULL, ""Body"" TEXT NOT NULL, ""CreatedAt"" TEXT NOT NULL);");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""Sprints"" (""Id"" TEXT PRIMARY KEY, ""ProjectId"" TEXT NOT NULL, ""Name"" TEXT NOT NULL, ""CreatedAt"" TEXT NOT NULL);");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""BoardAutomations"" (""Id"" TEXT PRIMARY KEY, ""ProjectId"" TEXT NOT NULL, ""Trigger"" TEXT NOT NULL, ""Action"" TEXT NOT NULL, ""Enabled"" INTEGER NOT NULL, ""CreatedAt"" TEXT NOT NULL);");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""Triggers"" (""Id"" TEXT PRIMARY KEY, ""Name"" TEXT NOT NULL, ""ProjectId"" TEXT NOT NULL, ""Pack"" TEXT NOT NULL, ""Type"" TEXT NOT NULL, ""IntervalSec"" INTEGER NOT NULL, ""Enabled"" INTEGER NOT NULL, ""LastRunAt"" TEXT NULL, ""CreatedAt"" TEXT NOT NULL);");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""Connectors"" (""Id"" TEXT PRIMARY KEY, ""Name"" TEXT NOT NULL, ""Provider"" TEXT NOT NULL, ""ApiKey"" TEXT NOT NULL, ""BaseUrl"" TEXT NULL, ""Models"" TEXT NOT NULL, ""Active"" INTEGER NOT NULL, ""CreatedAt"" TEXT NOT NULL);");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""LedgerEntries"" (""Id"" TEXT PRIMARY KEY, ""RunId"" TEXT NOT NULL, ""StageId"" TEXT NOT NULL, ""Lever"" TEXT NOT NULL, ""TokensBefore"" INTEGER NOT NULL, ""TokensAfter"" INTEGER NOT NULL, ""Saved"" INTEGER NOT NULL);");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""WorkspaceConnectors"" (""ProjectId"" TEXT PRIMARY KEY, ""ConnectorId"" TEXT NOT NULL, ""UpdatedAt"" TEXT NOT NULL);");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""ProjectPacks"" (""Id"" TEXT PRIMARY KEY, ""ProjectId"" TEXT NOT NULL, ""PackName"" TEXT NOT NULL, ""InstalledVersion"" TEXT NOT NULL, ""CreatedAt"" TEXT NOT NULL, ""UpdatedAt"" TEXT NOT NULL, UNIQUE(""ProjectId"", ""PackName""));");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""UsageStats"" (""Id"" TEXT PRIMARY KEY, ""ProjectId"" TEXT NULL, ""BlockKind"" TEXT NOT NULL, ""BlockName"" TEXT NOT NULL, ""Invocations"" INTEGER NOT NULL, ""LastUsedAt"" TEXT NOT NULL, ""UpdatedAt"" TEXT NOT NULL, UNIQUE(""ProjectId"", ""BlockKind"", ""BlockName""));");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""Designs"" (""Id"" TEXT PRIMARY KEY, ""ProjectId"" TEXT NOT NULL, ""Name"" TEXT NOT NULL, ""Description"" TEXT NOT NULL, ""CreatedAt"" TEXT NOT NULL);");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""DesignArtifacts"" (""Id"" TEXT PRIMARY KEY, ""DesignId"" TEXT NOT NULL, ""Kind"" TEXT NOT NULL, ""Title"" TEXT NOT NULL, ""Format"" TEXT NOT NULL, ""Content"" TEXT NOT NULL, ""Version"" INTEGER NOT NULL, ""CreatedAt"" TEXT NOT NULL, ""UpdatedAt"" TEXT NOT NULL);");
        ctx.Execute(@"CREATE TABLE IF NOT EXISTS ""DesignVersions"" (""Id"" TEXT PRIMARY KEY, ""ArtifactId"" TEXT NOT NULL, ""Build"" INTEGER NOT NULL, ""Content"" TEXT NOT NULL, ""CreatedAt"" TEXT NOT NULL);");
    }
}
