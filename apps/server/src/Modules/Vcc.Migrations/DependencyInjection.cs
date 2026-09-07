using Microsoft.Extensions.DependencyInjection;
using Vcc.Migrations.Abstractions;
using Vcc.Migrations.Runners;

namespace Vcc.Migrations;

public static class DependencyInjection
{
    public static IServiceCollection AddMigrations(this IServiceCollection services)
    {
        services.AddSingleton<MigrationConnectionFactory>();
        services.AddSingleton<ISchemaMigration, Schema.Sqlite.SM001_CreateCoreTables>();
        services.AddSingleton<ISchemaMigration, Schema.Postgres.SM001_CreateCoreTables>();
        services.AddSingleton<ISchemaMigration, Schema.Sqlite.SM002_CreateOutbox>();
        services.AddSingleton<ISchemaMigration, Schema.Postgres.SM002_CreateOutbox>();
        services.AddSingleton<ISchemaMigration, Schema.Sqlite.SM003_CreateMemory>();
        services.AddSingleton<ISchemaMigration, Schema.Postgres.SM003_CreateMemory>();
        services.AddSingleton<ISchemaMigration, Schema.Sqlite.SM004_CreateFeatureFlags>();
        services.AddSingleton<ISchemaMigration, Schema.Postgres.SM004_CreateFeatureFlags>();
        services.AddSingleton<ISchemaMigration, Schema.Sqlite.SM005_ResourceVersioning>();
        services.AddSingleton<ISchemaMigration, Schema.Postgres.SM005_ResourceVersioning>();
        services.AddSingleton<IDataMigration, Data.DM001_SeedMarketplace>();
        services.AddSingleton<SchemaMigrationRunner>();
        services.AddSingleton<DataMigrationRunner>();
        services.AddSingleton<MigrationOrchestrator>();
        return services;
    }
}
