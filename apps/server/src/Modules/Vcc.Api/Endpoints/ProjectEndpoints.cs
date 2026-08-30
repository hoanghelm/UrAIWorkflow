using Vcc.Projects.Contracts;
using Vcc.Projects.Services;

namespace Vcc.Api.Endpoints;

public static class ProjectEndpoints
{
    public static IEndpointRouteBuilder MapProjects(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/catalog/projects").WithTags("Projects");

        group.MapGet("", async (IProjectService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(ct)));

        group.MapPost("", async (RegisterProjectInput body, IProjectService svc, CancellationToken ct) =>
            Results.Ok(await svc.RegisterAsync(body, ct)));

        group.MapPost("/clone", async (CloneProjectInput body, IProjectService svc, CancellationToken ct) =>
            Results.Ok(await svc.CloneAsync(body, ct)));

        group.MapPatch("/{id}/persona", async (string id, PersonaInput body, IProjectService svc, CancellationToken ct) =>
        {
            var p = await svc.SetPersonaAsync(id, body.Persona, ct);
            return p is null ? Results.NotFound() : Results.Ok(p);
        });

        group.MapDelete("/{id}", async (string id, IProjectService svc, CancellationToken ct) =>
            await svc.DeleteAsync(id, ct) ? Results.Ok(new { id }) : Results.NotFound());

        group.MapPost("/{id}/discover", async (string id, IProjectService svc, CancellationToken ct) =>
            Results.Ok(await svc.DiscoverAsync(id, ct)));

        group.MapGet("/{id}/folders", async (string id, IProjectService svc, CancellationToken ct) =>
            Results.Ok(await svc.FoldersAsync(id, ct)));

        group.MapGet("/{id}/diagram", async (string id, IProjectService svc, CancellationToken ct) =>
            Results.Ok(await svc.DiagramAsync(id, ct)));

        group.MapGet("/{id}/codegraph", async (string id, IProjectService svc, CancellationToken ct) =>
            Results.Ok(await svc.CodeGraphAsync(id, ct)));

        group.MapGet("/{id}/codegraph/diagram", async (string id, string? level, IProjectService svc, CancellationToken ct) =>
            Results.Ok(await svc.CodeDiagramAsync(id, level ?? "folder", ct)));

        group.MapPost("/{id}/explain", async (string id, ExplainInput body, IProjectService svc, CancellationToken ct) =>
            Results.Ok(await svc.ExplainAsync(id, body, ct)));

        var catalog = app.MapGroup("/api/catalog").WithTags("Projects");

        catalog.MapGet("", async (string? projectId, IProjectService svc, CancellationToken ct) =>
            Results.Ok(await svc.CatalogAsync(projectId, ct)));

        catalog.MapGet("/summary", async (IProjectService svc, CancellationToken ct) =>
            Results.Ok(await svc.SummariesAsync(ct)));

        catalog.MapDelete("/items/{id}", async (string id, IProjectService svc, CancellationToken ct) =>
            await svc.DeleteCatalogItemAsync(id, ct) ? Results.Ok(new { id }) : Results.NotFound());

        return app;
    }
}
