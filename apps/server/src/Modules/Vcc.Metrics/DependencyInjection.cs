using Microsoft.Extensions.DependencyInjection;
using Vcc.Metrics.Services;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Metrics;

public static class DependencyInjection
{
    public static IServiceCollection AddMetricsModule(this IServiceCollection services)
    {
        services.AddScoped<IMetricsRecorder, MetricsRecorder>();
        services.AddScoped<IMetricsReadService, MetricsReadService>();
        return services;
    }
}
