using Microsoft.EntityFrameworkCore;
using Vcc.Domain.Entities;

namespace Vcc.Infrastructure.Persistence.Abstractions;

public interface IProjectDbContext
{
    DbSet<Project> Projects { get; }
    DbSet<ProjectPack> ProjectPacks { get; }
    DbSet<WorkspaceConnector> WorkspaceConnectors { get; }
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

public interface IBoardDbContext
{
    DbSet<BoardCard> BoardCards { get; }
    DbSet<BoardComment> BoardComments { get; }
    DbSet<Sprint> Sprints { get; }
    DbSet<BoardAutomation> BoardAutomations { get; }
    DbSet<Trigger> Triggers { get; }
    DbSet<Artifact> Artifacts { get; }
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

public interface IRunDbContext
{
    DbSet<Run> Runs { get; }
    DbSet<Stage> Stages { get; }
    DbSet<RunEvent> RunEvents { get; }
    DbSet<Checkpoint> Checkpoints { get; }
    DbSet<StageLog> StageLogs { get; }
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

public interface IPackageDbContext
{
    DbSet<Bundle> Bundles { get; }
    DbSet<CatalogItem> CatalogItems { get; }
    DbSet<Pack> Packs { get; }
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

public interface IConnectorDbContext
{
    DbSet<Connector> Connectors { get; }
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

public interface IDesignDbContext
{
    DbSet<Design> Designs { get; }
    DbSet<DesignArtifact> DesignArtifacts { get; }
    DbSet<DesignVersion> DesignVersions { get; }
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

public interface IMetricsDbContext
{
    DbSet<LedgerEntry> LedgerEntries { get; }
    DbSet<UsageStat> UsageStats { get; }
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
