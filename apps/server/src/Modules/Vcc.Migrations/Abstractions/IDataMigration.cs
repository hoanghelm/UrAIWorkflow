namespace Vcc.Migrations.Abstractions;

public interface IDataMigration
{
    int Version { get; }
    Task MigrateAsync(DataContext ctx, CancellationToken ct);
}
