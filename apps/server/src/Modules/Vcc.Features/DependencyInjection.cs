using Microsoft.Extensions.DependencyInjection;
using Vcc.Features.Capabilities;
using Vcc.Features.Services;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Features;

public static class DependencyInjection
{
    public static IServiceCollection AddFeaturesModule(this IServiceCollection services)
    {
        services.AddSingleton<ICapabilityInspector, CapabilityInspector>();
        services.AddScoped<IFeatureFlags, FeatureFlagService>();
        return services;
    }
}
