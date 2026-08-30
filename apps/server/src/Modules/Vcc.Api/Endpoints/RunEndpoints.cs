using Vcc.Orchestration.Runner;

namespace Vcc.Api.Endpoints;

public sealed record ResumeRunRequest(string Answer);

public static class RunEndpoints
{
    public static IEndpointRouteBuilder MapRuns(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/runs").WithTags("Runs");

        group.MapGet("", async (string? projectId, IRunReadService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(projectId, ct)));

        group.MapGet("/headroom", async (IRunReadService svc, CancellationToken ct) =>
            Results.Ok(await svc.HeadroomAsync(ct)));

        group.MapPost("", async (CreateRunInput body, IRunActionService svc, CancellationToken ct) =>
            Results.Ok(new { id = await svc.CreateAsync(body, ct) }));

        group.MapGet("/{id}", async (string id, IRunReadService svc, CancellationToken ct) =>
        {
            var row = await svc.GetAsync(id, ct);
            return row is null ? Results.NotFound() : Results.Ok(row);
        });

        group.MapGet("/{id}/events", async (string id, IRunReadService svc, CancellationToken ct) =>
            Results.Ok(await svc.EventsAsync(id, ct)));

        group.MapGet("/{id}/logs", async (string id, IRunReadService svc, CancellationToken ct) =>
            Results.Ok(await svc.LogsAsync(id, ct)));

        group.MapGet("/{id}/artifacts", async (string id, IRunReadService svc, CancellationToken ct) =>
            Results.Ok(await svc.ArtifactsAsync(id, ct)));

        group.MapGet("/{id}/diff", async (string id, IRunActionService svc, CancellationToken ct) =>
            Results.Ok(await svc.DiffAsync(id, ct)));

        group.MapPost("/{id}/commit", async (string id, IRunActionService svc, CancellationToken ct) =>
            Results.Ok(await svc.CommitAsync(id, ct)));

        group.MapPost("/{id}/resume", async (string id, ResumeRunRequest body, IRunActionService svc, CancellationToken ct) =>
            await svc.ResumeAsync(id, body.Answer, ct) ? Results.Ok(new { id }) : Results.NotFound());

        group.MapPost("/{id}/stop", async (string id, IRunActionService svc, CancellationToken ct) =>
            await svc.StopAsync(id, ct) ? Results.Ok(new { id }) : Results.NotFound());

        group.MapPost("/{id}/rerun/{stageId}", async (string id, string stageId, IRunActionService svc, CancellationToken ct) =>
            await svc.RerunStageAsync(id, stageId, ct) ? Results.Ok(new { id, stageId }) : Results.NotFound());

        group.MapDelete("/{id}", async (string id, IRunActionService svc, CancellationToken ct) =>
            await svc.DeleteAsync(id, ct) ? Results.Ok(new { id }) : Results.NotFound());

        return app;
    }
}
