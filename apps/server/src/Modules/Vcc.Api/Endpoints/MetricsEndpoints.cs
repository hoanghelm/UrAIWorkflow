using Vcc.Metrics.Services;

namespace Vcc.Api.Endpoints;

public static class MetricsEndpoints
{
    public static IEndpointRouteBuilder MapMetrics(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/ledger/run/{runId}", async (string runId, IMetricsReadService svc, CancellationToken ct) =>
            Results.Ok(await svc.LedgerRunAsync(runId, ct))).WithTags("Metrics");

        app.MapGet("/api/ledger/project/{projectId}", async (string projectId, IMetricsReadService svc, CancellationToken ct) =>
            Results.Ok(await svc.LedgerProjectAsync(projectId, ct))).WithTags("Metrics");

        app.MapGet("/api/stats", async (string projectId, IMetricsReadService svc, CancellationToken ct) =>
            Results.Ok(await svc.StatsAsync(projectId, ct))).WithTags("Metrics");

        app.MapPost("/api/stats/backfill", async (string projectId, IMetricsReadService svc, CancellationToken ct) =>
            Results.Ok(await svc.BackfillAsync(projectId, ct))).WithTags("Metrics");

        return app;
    }
}
