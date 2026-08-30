using Vcc.Packages.Contracts;
using Vcc.Packages.Services;

namespace Vcc.Api.Endpoints;

public static class PackEndpoints
{
    public static IEndpointRouteBuilder MapPacks(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/packs").WithTags("Packs");

        group.MapGet("", async (IPackService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(ct)));

        group.MapGet("/project/{projectId}", async (string projectId, IPackService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListForProjectAsync(projectId, ct)));

        group.MapGet("/{name}", async (string name, IPackService svc, CancellationToken ct) =>
        {
            var manifest = await svc.GetManifestAsync(name, ct);
            return manifest is null ? Results.NotFound() : Results.Ok(manifest);
        });

        group.MapPost("/{name}/install", async (string name, InstallPackInput body, IPackService svc, CancellationToken ct) =>
        {
            var result = await svc.InstallAsync(name, body.ProjectId, ct);
            return result is null ? Results.NotFound() : Results.Ok(new { packName = result.Value.packName, installedVersion = result.Value.installedVersion });
        });

        group.MapPost("/{name}/uninstall", async (string name, InstallPackInput body, IPackService svc, CancellationToken ct) =>
            Results.Ok(new { packName = await svc.UninstallAsync(name, body.ProjectId, ct) }));

        return app;
    }
}
