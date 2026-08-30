using Microsoft.Extensions.DependencyInjection;
using Vcc.Projects.Mapping;
using Vcc.Projects.Services;

namespace Vcc.Projects;

public static class DependencyInjection
{
    public static IServiceCollection AddProjectsModule(this IServiceCollection services)
    {
        services.AddSingleton<IProjectMapper, ProjectMapper>();
        services.AddScoped<IProjectService, ProjectService>();
        return services;
    }
}
