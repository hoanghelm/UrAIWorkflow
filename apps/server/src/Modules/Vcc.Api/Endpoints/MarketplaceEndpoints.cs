using Vcc.Packages.Contracts;
using Vcc.Packages.Services;

namespace Vcc.Api.Endpoints;

public static class MarketplaceEndpoints
{
    public static IEndpointRouteBuilder MapMarketplace(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/marketplace", async (string? q, string? kind, string? tag, string? projectId, int? limit, int? offset, IMarketplaceService svc, CancellationToken ct) =>
            Results.Ok(await svc.SearchAsync(new MarketplaceQuery(q, kind, tag, projectId, limit ?? 0, offset ?? 0), ct))).WithTags("Marketplace");

        app.MapPost("/api/marketplace/install", async (InstallComponentsInput body, IMarketplaceService svc, CancellationToken ct) =>
            Results.Ok(await svc.InstallAsync(body.ProjectId, body.Ids, ct))).WithTags("Marketplace");

        app.MapPost("/api/marketplace/{key}/pin", async (string key, PinBundleInput body, IMarketplaceService svc, CancellationToken ct) =>
        {
            var version = await svc.PinAsync(body.ProjectId, key, body.Version, ct);
            return version is null ? Results.NotFound() : Results.Ok(new { key, pinnedVersion = version });
        }).WithTags("Marketplace");

        app.MapPost("/api/marketplace/{key}/unpin", async (string key, InstallPackInput body, IMarketplaceService svc, CancellationToken ct) =>
            Results.Ok(new { key, unpinned = await svc.UnpinAsync(body.ProjectId, key, ct) })).WithTags("Marketplace");

        app.MapPost("/api/marketplace/import", async (ImportBundleInput body, IMarketplaceService svc, CancellationToken ct) =>
        {
            var item = await svc.ImportAsync(body.Source, body.Kind ?? "skill", body.Name, ct);
            return item is null
                ? Results.BadRequest(new { error = "could not fetch content from source" })
                : Results.Ok(item);
        }).WithTags("Marketplace");

        return app;
    }
}
