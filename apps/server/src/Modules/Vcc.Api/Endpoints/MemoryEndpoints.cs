using Vcc.Shared.Application.Interfaces;

namespace Vcc.Api.Endpoints;

public sealed record MemoryInput(string Scope, string Key, string Content);

public static class MemoryEndpoints
{
    public static IEndpointRouteBuilder MapMemory(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/projects/{projectId}/memory", async (string projectId, IMemoryStore store, CancellationToken ct) =>
            Results.Ok(await store.ListAsync(projectId, ct))).WithTags("Memory");

        app.MapPost("/api/projects/{projectId}/memory", async (string projectId, MemoryInput body, IMemoryStore store, CancellationToken ct) =>
            Results.Ok(await store.UpsertAsync(projectId, string.IsNullOrWhiteSpace(body.Scope) ? "project" : body.Scope, body.Key, body.Content, ct))).WithTags("Memory");

        app.MapDelete("/api/memory/{id}", async (string id, IMemoryStore store, CancellationToken ct) =>
            await store.DeleteAsync(id, ct) ? Results.Ok(new { id }) : Results.NotFound()).WithTags("Memory");

        return app;
    }
}
