using Vcc.Design.Contracts;
using Vcc.Design.Services;

namespace Vcc.Api.Endpoints;

public static class DesignEndpoints
{
    public static IEndpointRouteBuilder MapDesigns(this IEndpointRouteBuilder app)
    {
        var designs = app.MapGroup("/api/designs").WithTags("Designs");

        designs.MapGet("", async (string projectId, IDesignService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(projectId, ct)));

        designs.MapPost("", async (CreateDesignInput body, IDesignService svc, CancellationToken ct) =>
            Results.Ok(await svc.CreateAsync(body, ct)));

        designs.MapGet("/{id}", async (string id, IDesignService svc, CancellationToken ct) =>
        {
            var d = await svc.GetAsync(id, ct);
            return d is null ? Results.NotFound() : Results.Ok(d);
        });

        designs.MapPatch("/{id}", async (string id, UpdateDesignInput body, IDesignService svc, CancellationToken ct) =>
        {
            var d = await svc.UpdateAsync(id, body, ct);
            return d is null ? Results.NotFound() : Results.Ok(d);
        });

        designs.MapDelete("/{id}", async (string id, IDesignService svc, CancellationToken ct) =>
            await svc.DeleteAsync(id, ct) ? Results.Ok(new { id }) : Results.NotFound());

        designs.MapGet("/{id}/artifacts", async (string id, IDesignService svc, CancellationToken ct) =>
            Results.Ok(await svc.ArtifactsAsync(id, ct)));

        var artifacts = app.MapGroup("/api/design-artifacts").WithTags("Designs");

        artifacts.MapPost("", async (CreateDesignArtifactInput body, IDesignService svc, CancellationToken ct) =>
            Results.Ok(await svc.CreateArtifactAsync(body, ct)));

        artifacts.MapGet("/{id}", async (string id, IDesignService svc, CancellationToken ct) =>
        {
            var a = await svc.GetArtifactAsync(id, ct);
            return a is null ? Results.NotFound() : Results.Ok(a);
        });

        artifacts.MapPatch("/{id}", async (string id, UpdateDesignArtifactInput body, IDesignService svc, CancellationToken ct) =>
        {
            var a = await svc.UpdateArtifactAsync(id, body, ct);
            return a is null ? Results.NotFound() : Results.Ok(a);
        });

        artifacts.MapDelete("/{id}", async (string id, IDesignService svc, CancellationToken ct) =>
            await svc.DeleteArtifactAsync(id, ct) ? Results.Ok(new { id }) : Results.NotFound());

        artifacts.MapGet("/{id}/versions", async (string id, IDesignService svc, CancellationToken ct) =>
            Results.Ok(await svc.VersionsAsync(id, ct)));

        artifacts.MapPost("/{id}/restore", async (string id, RestoreVersionInput body, IDesignService svc, CancellationToken ct) =>
        {
            var a = await svc.RestoreVersionAsync(id, body.VersionId, ct);
            return a is null ? Results.NotFound() : Results.Ok(a);
        });

        artifacts.MapPost("/{id}/generate", async (string id, GenerateArtifactInput body, IDesignService svc, CancellationToken ct) =>
        {
            var a = await svc.GenerateArtifactAsync(id, body, ct);
            return a is null ? Results.NotFound() : Results.Ok(a);
        });

        app.MapPost("/api/design-generate", (GeneratePreviewInput body, IDesignService svc) =>
            Results.Ok(svc.GeneratePreview(body))).WithTags("Designs");

        app.MapGet("/api/design-workflows", (IDesignService svc) =>
            Results.Ok(svc.Workflows())).WithTags("Designs");

        return app;
    }
}
