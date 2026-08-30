using Vcc.Shared.Application.Interfaces;

namespace Vcc.Api.Endpoints;

public static class WhoamiEndpoints
{
    public static IEndpointRouteBuilder MapWhoami(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/whoami", (IServerPolicy policy, IConfiguration config) => Results.Ok(new
        {
            mode = config["DEPLOYMENT_MODE"] ?? "local",
            authRequired = string.Equals(config["DEPLOYMENT_MODE"], "hosted", StringComparison.OrdinalIgnoreCase),
            version = "0.1.0",
            allowedModels = policy.AllowedModels,
            allowedProviders = policy.AllowedProviders,
            connectorsLocked = policy.ConnectorsLocked
        }));
        return app;
    }
}
