using Vcc.Connectors.Auth;
using Vcc.Connectors.Contracts;
using Vcc.Connectors.Services;

namespace Vcc.Api.Endpoints;

public sealed record CopilotPollRequest(string DeviceCode);

public static class ConnectorEndpoints
{
    public static IEndpointRouteBuilder MapConnectors(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/connectors").WithTags("Connectors");

        group.MapGet("", async (IConnectorService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(ct)));

        group.MapPost("", async (CreateConnectorInput body, IConnectorService svc, CancellationToken ct) =>
            Results.Ok(await svc.CreateAsync(body, ct)));

        group.MapPost("/deactivate", async (IConnectorService svc, CancellationToken ct) =>
            Results.Ok(await svc.DeactivateAllAsync(ct)));

        group.MapGet("/usage", async (IConnectorService svc, CancellationToken ct) =>
            Results.Ok(await svc.UsageAsync(ct)));

        group.MapGet("/active", async (string projectId, IConnectorService svc, CancellationToken ct) =>
            Results.Ok(new { connectorId = await svc.GetActiveForProjectAsync(projectId, ct) }));

        group.MapPost("/active", async (SetActiveConnectorInput body, IConnectorService svc, CancellationToken ct) =>
            Results.Ok(new { connectorId = await svc.SetActiveForProjectAsync(body.ProjectId, body.ConnectorId, ct) }));

        group.MapDelete("/active", async (string projectId, IConnectorService svc, CancellationToken ct) =>
        {
            await svc.ClearActiveForProjectAsync(projectId, ct);
            return Results.Ok(new { projectId });
        });

        group.MapPost("/copilot/login", async (ICopilotAuthService svc, CancellationToken ct) =>
            Results.Ok(await svc.LoginAsync(ct)));

        group.MapPost("/copilot/poll", async (CopilotPollRequest body, ICopilotAuthService svc, CancellationToken ct) =>
            Results.Ok(await svc.PollAsync(body.DeviceCode, ct)));

        group.MapPost("/{id}/activate", async (string id, IConnectorService svc, CancellationToken ct) =>
        {
            var c = await svc.ActivateAsync(id, ct);
            return c is null ? Results.NotFound() : Results.Ok(c);
        });

        group.MapPost("/{id}/test", async (string id, IConnectorService svc, CancellationToken ct) =>
        {
            var (ok, error) = await svc.TestAsync(id, ct);
            return Results.Ok(new { ok, error });
        });

        group.MapDelete("/{id}", async (string id, IConnectorService svc, CancellationToken ct) =>
            await svc.DeleteAsync(id, ct) ? Results.Ok(new { id }) : Results.NotFound());

        return app;
    }
}
