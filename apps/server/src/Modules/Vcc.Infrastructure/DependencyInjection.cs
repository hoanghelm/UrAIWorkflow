using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Vcc.Infrastructure.Persistence;
using Vcc.Infrastructure.Persistence.Abstractions;

namespace Vcc.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        var mode = config["DEPLOYMENT_MODE"] ?? "local";
        var connection = config.GetConnectionString("Default");

        services.AddDbContext<VccDbContext>(options =>
        {
            if (string.Equals(mode, "hosted", StringComparison.OrdinalIgnoreCase))
                options.UseNpgsql(connection ?? "Host=localhost;Database=vcc;Username=postgres;Password=postgres");
            else
                options.UseSqlite(connection ?? "Data Source=data/vcc.db")
                       .AddInterceptors(new Persistence.SqlitePragmaInterceptor());
        });

        services.AddScoped<IProjectDbContext>(sp => sp.GetRequiredService<VccDbContext>());
        services.AddScoped<IBoardDbContext>(sp => sp.GetRequiredService<VccDbContext>());
        services.AddScoped<IRunDbContext>(sp => sp.GetRequiredService<VccDbContext>());
        services.AddScoped<IPackageDbContext>(sp => sp.GetRequiredService<VccDbContext>());
        services.AddScoped<IConnectorDbContext>(sp => sp.GetRequiredService<VccDbContext>());
        services.AddScoped<IDesignDbContext>(sp => sp.GetRequiredService<VccDbContext>());
        services.AddScoped<IMetricsDbContext>(sp => sp.GetRequiredService<VccDbContext>());
        return services;
    }
}
