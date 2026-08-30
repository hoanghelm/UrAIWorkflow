using Microsoft.EntityFrameworkCore;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;

namespace Vcc.Infrastructure.Persistence;

public sealed class VccDbContext(DbContextOptions<VccDbContext> options)
    : DbContext(options),
      IProjectDbContext, IBoardDbContext, IRunDbContext, IPackageDbContext,
      IConnectorDbContext, IDesignDbContext, IMetricsDbContext
{
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectPack> ProjectPacks => Set<ProjectPack>();
    public DbSet<WorkspaceConnector> WorkspaceConnectors => Set<WorkspaceConnector>();
    public DbSet<BoardCard> BoardCards => Set<BoardCard>();
    public DbSet<BoardComment> BoardComments => Set<BoardComment>();
    public DbSet<Sprint> Sprints => Set<Sprint>();
    public DbSet<BoardAutomation> BoardAutomations => Set<BoardAutomation>();
    public DbSet<Trigger> Triggers => Set<Trigger>();
    public DbSet<Artifact> Artifacts => Set<Artifact>();
    public DbSet<Run> Runs => Set<Run>();
    public DbSet<Stage> Stages => Set<Stage>();
    public DbSet<RunEvent> RunEvents => Set<RunEvent>();
    public DbSet<Checkpoint> Checkpoints => Set<Checkpoint>();
    public DbSet<StageLog> StageLogs => Set<StageLog>();
    public DbSet<Bundle> Bundles => Set<Bundle>();
    public DbSet<CatalogItem> CatalogItems => Set<CatalogItem>();
    public DbSet<Pack> Packs => Set<Pack>();
    public DbSet<Connector> Connectors => Set<Connector>();
    public DbSet<Design> Designs => Set<Design>();
    public DbSet<DesignArtifact> DesignArtifacts => Set<DesignArtifact>();
    public DbSet<DesignVersion> DesignVersions => Set<DesignVersion>();
    public DbSet<LedgerEntry> LedgerEntries => Set<LedgerEntry>();
    public DbSet<UsageStat> UsageStats => Set<UsageStat>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<WorkspaceConnector>().HasKey(x => x.ProjectId);
        base.OnModelCreating(modelBuilder);
    }
}
