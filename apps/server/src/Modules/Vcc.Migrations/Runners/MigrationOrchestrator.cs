namespace Vcc.Migrations.Runners;

public sealed class MigrationOrchestrator(SchemaMigrationRunner schema, DataMigrationRunner data)
{
    public async Task RunAsync(CancellationToken ct = default)
    {
        await schema.RunAsync(ct);
        await data.RunAsync(ct);
    }
}
