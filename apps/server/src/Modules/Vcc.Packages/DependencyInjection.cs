using Microsoft.Extensions.DependencyInjection;
using Vcc.Packages.Bundles;
using Vcc.Packages.Services;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Packages;

public static class DependencyInjection
{
    public static IServiceCollection AddPackagesModule(this IServiceCollection services)
    {
        services.AddSingleton<IBundleStore, BundleStore>();
        services.AddSingleton<IResourceStore, ResourceStore>();
        services.AddHttpClient<IBundleFetcher, BundleFetcher>(c => c.Timeout = TimeSpan.FromSeconds(20));
        services.AddScoped<IPackService, PackService>();
        services.AddScoped<IMarketplaceService, MarketplaceService>();
        services.AddScoped<IResourceSnapshot, ResourceSnapshotProvider>();
        return services;
    }
}
