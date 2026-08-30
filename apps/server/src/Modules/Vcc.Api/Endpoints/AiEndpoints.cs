using System.Text.Json;
using Vcc.Packages.Common;
using Vcc.Packages.Services;

namespace Vcc.Api.Endpoints;

public sealed record WorkflowFromPackRequest(string Pack, Dictionary<string, object>? Inputs);
public sealed record GenerateRequest(string Requirement, string? Context, string? StreamId);
public sealed record AiGenerateRequest(string Kind, string Requirement, string? Context, string? Persona, string? StreamId);

public static class AiEndpoints
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static IEndpointRouteBuilder MapAi(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/ai/personas", () =>
        {
            var file = System.IO.Path.Combine(AppContext.BaseDirectory, "data", "personas.json");
            if (!File.Exists(file)) return Results.Ok(Array.Empty<object>());
            using var doc = JsonDocument.Parse(File.ReadAllText(file));
            return Results.Ok(doc.RootElement.Clone());
        }).WithTags("AI");

        app.MapPost("/api/workflows/from-pack", async (WorkflowFromPackRequest body, IPackService svc, CancellationToken ct) =>
        {
            var manifest = await svc.GetManifestAsync(body.Pack, ct);
            if (manifest is null) return Results.NotFound();
            var m = manifest.Value;
            var workflow = new
            {
                name = PackJson.Str(m, "title", body.Pack),
                pack = body.Pack,
                inputs = body.Inputs ?? new Dictionary<string, object>(),
                stages = m.TryGetProperty("stages", out var st) ? st.Clone() : JsonDocument.Parse("[]").RootElement.Clone(),
                levers = m.TryGetProperty("levers", out var lv) ? lv.Clone() : JsonDocument.Parse("[]").RootElement.Clone(),
                routing = new { },
                guardrails = m.TryGetProperty("guardrails", out var g) ? g.Clone() : JsonDocument.Parse("{}").RootElement.Clone(),
            };
            return Results.Ok(workflow);
        }).WithTags("AI");

        app.MapPost("/api/workflows/generate", (GenerateRequest body) =>
        {
            var stages = new[]
            {
                new { id = "plan", title = "Plan", agent = "analyst", model = "opus", skills = Array.Empty<string>(), tools = Array.Empty<string>() },
                new { id = "act", title = "Act", agent = "developer", model = "sonnet", skills = Array.Empty<string>(), tools = Array.Empty<string>() },
                new { id = "verify", title = "Verify", agent = "reviewer", model = "sonnet", skills = Array.Empty<string>(), tools = Array.Empty<string>() },
            };
            return Results.Ok(new
            {
                name = body.Requirement.Length > 40 ? body.Requirement[..40] : body.Requirement,
                pack = "eng-loop",
                inputs = new { requirement = body.Requirement, context = body.Context ?? "" },
                stages,
                levers = new[] { "codegraph", "ponytail" },
                routing = new { },
                guardrails = new { },
            });
        }).WithTags("AI");

        app.MapPost("/api/diagrams/generate", (GenerateRequest body) =>
            Results.Ok(new { mermaid = Mermaid(body.Requirement), model = "sonnet" })).WithTags("AI");

        app.MapPost("/api/ai/generate", (AiGenerateRequest body) =>
            Results.Ok(new
            {
                kind = body.Kind,
                artifact = new { content = $"# {body.Kind}\n\n{body.Requirement}\n" },
                summary = $"Generated {body.Kind} for: {body.Requirement}",
            })).WithTags("AI");

        return app;
    }

    private static string Mermaid(string requirement)
    {
        var steps = requirement.Split([',', '.', ';', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(s => s.Length > 0).Take(6).ToList();
        if (steps.Count == 0) steps = ["Start", "Process", "End"];
        var lines = new List<string> { "flowchart TD" };
        for (var i = 0; i < steps.Count; i++)
        {
            lines.Add($"    n{i}[\"{steps[i].Replace("\"", "'")}\"]");
            if (i > 0) lines.Add($"    n{i - 1} --> n{i}");
        }
        return string.Join("\n", lines);
    }
}
