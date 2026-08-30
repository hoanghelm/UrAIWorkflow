using SqlKata.Execution;

namespace Vcc.Migrations.Abstractions;

public sealed class DataContext(QueryFactory db, DbProvider provider, IServiceProvider services)
{
    public QueryFactory Db { get; } = db;
    public DbProvider Provider { get; } = provider;
    public IServiceProvider Services { get; } = services;
}
