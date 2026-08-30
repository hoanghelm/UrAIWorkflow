using Vcc.Board.Contracts;
using Vcc.Board.Services;

namespace Vcc.Api.Endpoints;

public static class BoardEndpoints
{
    public static IEndpointRouteBuilder MapBoard(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/board").WithTags("Board");

        group.MapGet("", async (string projectId, IBoardService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(projectId, ct)));

        group.MapPost("", async (CreateBoardCardInput body, IBoardService svc, CancellationToken ct) =>
            Results.Ok(await svc.CreateAsync(body, ct)));

        group.MapGet("/sprints", async (string projectId, IBoardService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListSprintsAsync(projectId, ct)));

        group.MapPost("/sprints", async (CreateSprintInput body, IBoardService svc, CancellationToken ct) =>
            Results.Ok(await svc.CreateSprintAsync(body, ct)));

        group.MapGet("/automations", async (string projectId, IBoardService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListAutomationsAsync(projectId, ct)));

        group.MapPost("/automations", async (CreateAutomationInput body, IBoardService svc, CancellationToken ct) =>
            Results.Ok(await svc.CreateAutomationAsync(body, ct)));

        group.MapPatch("/automations/{id}", async (string id, EnabledInput body, IBoardService svc, CancellationToken ct) =>
        {
            var updated = await svc.SetAutomationEnabledAsync(id, body.Enabled, ct);
            return updated is null ? Results.NotFound() : Results.Ok(updated);
        });

        group.MapDelete("/automations/{id}", async (string id, IBoardService svc, CancellationToken ct) =>
        {
            await svc.DeleteAutomationAsync(id, ct);
            return Results.Ok(new { id });
        });

        group.MapGet("/artifacts", async (string projectId, IBoardService svc, CancellationToken ct) =>
            Results.Ok(await svc.ArtifactCardsAsync(projectId, ct)));

        group.MapGet("/artifact-versions", async (string projectId, IBoardService svc, CancellationToken ct) =>
            Results.Ok(await svc.ArtifactVersionsAsync(projectId, ct)));

        group.MapPost("/collect-all", async (ProjectIdInput body, IBoardService svc, CancellationToken ct) =>
            Results.Ok(await svc.CollectAllAsync(body.ProjectId, ct)));

        group.MapGet("/{id}/comments", async (string id, IBoardService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListCommentsAsync(id, ct)));

        group.MapPost("/{id}/comments", async (string id, CreateCommentInput body, IBoardService svc, CancellationToken ct) =>
            Results.Ok(await svc.AddCommentAsync(id, body, ct)));

        group.MapDelete("/{cardId}/comments/{commentId}", async (string commentId, IBoardService svc, CancellationToken ct) =>
        {
            await svc.DeleteCommentAsync(commentId, ct);
            return Results.Ok(new { id = commentId });
        });

        group.MapGet("/{id}/runs", async (string id, IBoardService svc, CancellationToken ct) =>
            Results.Ok(await svc.CardRunsAsync(id, ct)));

        group.MapGet("/{id}/activity", async (string id, IBoardService svc, CancellationToken ct) =>
            Results.Ok(await svc.CardActivityAsync(id, ct)));

        group.MapGet("/{id}/bundles", async (string id, IBoardService svc, CancellationToken ct) =>
            Results.Ok(await svc.BundlesAsync(id, ct)));

        group.MapPost("/{id}/run", async (string id, IBoardService svc, CancellationToken ct) =>
        {
            var card = await svc.RunAsync(id, ct);
            return card is null ? Results.NotFound() : Results.Ok(card);
        });

        group.MapPost("/{id}/rerun", async (string id, IBoardService svc, CancellationToken ct) =>
        {
            var card = await svc.RerunAsync(id, ct);
            return card is null ? Results.NotFound() : Results.Ok(card);
        });

        group.MapPost("/{id}/plan", async (string id, PlanInput body, IBoardService svc, CancellationToken ct) =>
            Results.Ok(await svc.PlanAsync(id, ct)));

        group.MapPost("/{id}/collect", async (string id, IBoardService svc, CancellationToken ct) =>
        {
            var card = await svc.CollectAsync(id, ct);
            return card is null ? Results.NotFound() : Results.Ok(card);
        });

        group.MapGet("/{id}/preview", (string id, IBoardService svc) => Results.Ok(svc.PreviewStatus(id)));

        group.MapPost("/{id}/preview", (string id, PreviewStartInput body, IBoardService svc) =>
            Results.Ok(svc.PreviewStart(id, body.ArtifactId)));

        group.MapPost("/{id}/preview/stop", (string id, IBoardService svc) => Results.Ok(svc.PreviewStop(id)));

        group.MapPost("/{id}/link", async (string id, LinkInput body, IBoardService svc, CancellationToken ct) =>
        {
            var card = await svc.LinkAsync(id, body.TargetId, ct);
            return card is null ? Results.NotFound() : Results.Ok(card);
        });

        group.MapDelete("/{id}/link/{targetId}", async (string id, string targetId, IBoardService svc, CancellationToken ct) =>
        {
            var card = await svc.UnlinkAsync(id, targetId, ct);
            return card is null ? Results.NotFound() : Results.Ok(card);
        });

        group.MapPatch("/{id}/move", async (string id, MoveBoardCardInput body, IBoardService svc, CancellationToken ct) =>
        {
            var card = await svc.MoveAsync(id, body, ct);
            return card is null ? Results.NotFound() : Results.Ok(card);
        });

        group.MapPatch("/{id}/labels", async (string id, LabelsInput body, IBoardService svc, CancellationToken ct) =>
        {
            var card = await svc.SetLabelsAsync(id, body.Labels, ct);
            return card is null ? Results.NotFound() : Results.Ok(card);
        });

        group.MapPatch("/{id}/assignee", async (string id, AssigneeInput body, IBoardService svc, CancellationToken ct) =>
        {
            var card = await svc.SetAssigneeAsync(id, body.Assignee, ct);
            return card is null ? Results.NotFound() : Results.Ok(card);
        });

        group.MapDelete("/{id}", async (string id, IBoardService svc, CancellationToken ct) =>
            await svc.DeleteAsync(id, ct) ? Results.Ok(new { id }) : Results.NotFound());

        group.MapPatch("/{id}", async (string id, UpdateBoardCardInput body, IBoardService svc, CancellationToken ct) =>
        {
            var card = await svc.UpdateAsync(id, body, ct);
            return card is null ? Results.NotFound() : Results.Ok(card);
        });

        return app;
    }
}
