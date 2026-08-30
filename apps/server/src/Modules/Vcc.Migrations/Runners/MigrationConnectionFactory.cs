using System.Data;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Npgsql;
using SqlKata.Compilers;
using Vcc.Migrations.Abstractions;

namespace Vcc.Migrations.Runners;

public sealed class MigrationConnectionFactory
{
    public DbProvider Provider { get; }
    public string ConnectionString { get; }

    public MigrationConnectionFactory(IConfiguration config)
    {
        var hosted = string.Equals(config["DEPLOYMENT_MODE"], "hosted", StringComparison.OrdinalIgnoreCase);
        Provider = hosted ? DbProvider.Postgres : DbProvider.Sqlite;
        ConnectionString = config.GetConnectionString("Default")
            ?? (hosted ? "Host=localhost;Database=vcc;Username=postgres;Password=postgres" : "Data Source=data/vcc.db");
    }

    public IDbConnection Open()
    {
        if (Provider == DbProvider.Postgres)
        {
            var pg = new NpgsqlConnection(ConnectionString);
            pg.Open();
            return pg;
        }
        EnsureSqliteDirectory();
        var sqlite = new SqliteConnection(ConnectionString);
        sqlite.Open();
        return sqlite;
    }

    public Compiler CreateCompiler() => Provider == DbProvider.Postgres ? new PostgresCompiler() : new SqliteCompiler();

    private void EnsureSqliteDirectory()
    {
        var dataSource = new SqliteConnectionStringBuilder(ConnectionString).DataSource;
        var dir = Path.GetDirectoryName(Path.GetFullPath(dataSource));
        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
    }
}
