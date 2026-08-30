using Microsoft.Extensions.DependencyInjection;
using Vcc.Design.Mapping;
using Vcc.Design.Services;

namespace Vcc.Design;

public static class DependencyInjection
{
    public static IServiceCollection AddDesignModule(this IServiceCollection services)
    {
        services.AddSingleton<IDesignMapper, DesignMapper>();
        services.AddScoped<IDesignService, DesignService>();
        return services;
    }
}
