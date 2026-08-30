using Vcc.Packages.Contracts;
using Vcc.Packages.Services;

namespace Vcc.Api.Endpoints;

public static class MarketplaceEndpoints
{
    public static IEndpointRouteBuilder MapMarketplace(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/marketplace", async (IMarketplaceService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(ct))).WithTags("Marketplace");

        app.MapPost("/api/marketplace/install", async (InstallComponentsInput body, IMarketplaceService svc, CancellationToken ct) =>
            Results.Ok(new { installed = await svc.InstallAsync(body.ProjectId, body.Ids, ct) })).WithTags("Marketplace");

        return app;
    }
}
