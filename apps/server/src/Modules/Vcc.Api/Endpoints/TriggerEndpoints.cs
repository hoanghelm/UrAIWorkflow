using Vcc.Orchestration.Triggers;

namespace Vcc.Api.Endpoints;

public sealed record TriggerEnabledRequest(bool Enabled);

public static class TriggerEndpoints
{
    public static IEndpointRouteBuilder MapTriggers(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/triggers").WithTags("Triggers");

        group.MapGet("", async (string? projectId, ITriggerService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(projectId, ct)));

        group.MapPost("", async (CreateTriggerInput body, ITriggerService svc, CancellationToken ct) =>
            Results.Ok(await svc.CreateAsync(body, ct)));

        group.MapPost("/{id}/fire", async (string id, ITriggerService svc, CancellationToken ct) =>
        {
            var runId = await svc.FireAsync(id, ct);
            return runId is null ? Results.NotFound() : Results.Ok(new { runId });
        });

        group.MapPatch("/{id}/enabled", async (string id, TriggerEnabledRequest body, ITriggerService svc, CancellationToken ct) =>
        {
            var updated = await svc.SetEnabledAsync(id, body.Enabled, ct);
            return updated is null ? Results.NotFound() : Results.Ok(updated);
        });

        group.MapDelete("/{id}", async (string id, ITriggerService svc, CancellationToken ct) =>
            await svc.DeleteAsync(id, ct) ? Results.Ok(new { id }) : Results.NotFound());

        return app;
    }
}
