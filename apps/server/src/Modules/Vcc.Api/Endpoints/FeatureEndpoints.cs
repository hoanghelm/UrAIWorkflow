using Vcc.Shared.Application.Interfaces;

namespace Vcc.Api.Endpoints;

public sealed record SetFeatureInput(bool Enabled);

public static class FeatureEndpoints
{
    public static IEndpointRouteBuilder MapFeatures(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/features", async (IFeatureFlags flags, CancellationToken ct) =>
            Results.Ok(await flags.ListAsync(ct))).WithTags("Features");

        app.MapGet("/api/features/capabilities", async (IFeatureFlags flags, CancellationToken ct) =>
            Results.Ok(await flags.CapabilitiesAsync(ct))).WithTags("Features");

        app.MapGet("/api/features/{key}", async (string key, IFeatureFlags flags, CancellationToken ct) =>
        {
            var state = await flags.GetAsync(key, ct);
            return state is null ? Results.NotFound() : Results.Ok(state);
        }).WithTags("Features");

        app.MapPatch("/api/features/{key}", async (string key, SetFeatureInput body, IFeatureFlags flags, CancellationToken ct) =>
        {
            var state = await flags.SetEnabledAsync(key, body.Enabled, ct);
            return state is null ? Results.NotFound() : Results.Ok(state);
        }).WithTags("Features");

        return app;
    }
}
