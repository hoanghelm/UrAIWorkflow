using Microsoft.Extensions.DependencyInjection;

namespace Vcc.Test;

public interface ITestService
{
    Task<IReadOnlyList<object>> ListAsync(string projectId, CancellationToken ct);
}

public sealed class TestService : ITestService
{
    public Task<IReadOnlyList<object>> ListAsync(string projectId, CancellationToken ct)
        => Task.FromResult<IReadOnlyList<object>>([]);
}

public static class DependencyInjection
{
    public static IServiceCollection AddTestModule(this IServiceCollection services)
    {
        services.AddScoped<ITestService, TestService>();
        return services;
    }
}
