using Microsoft.Extensions.DependencyInjection;
using Vcc.Packages.Services;

namespace Vcc.Packages;

public static class DependencyInjection
{
    public static IServiceCollection AddPackagesModule(this IServiceCollection services)
    {
        services.AddScoped<IPackService, PackService>();
        services.AddScoped<IMarketplaceService, MarketplaceService>();
        return services;
    }
}
