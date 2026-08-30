namespace Vcc.Migrations.Abstractions;

public interface ISchemaMigration
{
    int Version { get; }
    DbProvider Provider { get; }
    void Migrate(SchemaContext ctx);
}
