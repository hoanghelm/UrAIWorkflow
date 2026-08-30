using System.Text.Json;

namespace Vcc.Orchestration.Workflow;

public sealed record StageDef(string Id, string Title, string Agent, string Model, string Instruction, IReadOnlyList<string> Skills, IReadOnlyList<string> Tools, string? Verify, string? Gate, bool Parallel);

public sealed record GuardrailsDef(
    int MaxRetries, int MaxLoopDepth, long? BudgetTokens, int StageTimeoutMs,
    string QualityThreshold, string OnBreach, string? FallbackModel, IReadOnlyList<string> RequireHumanGate);

public sealed record WorkflowDef(string Name, IReadOnlyList<StageDef> Stages, GuardrailsDef Guardrails);

public sealed record ExecutionState(
    string Requirement, string Model, string ProjectRoot,
    int StageIndex, string Context, List<int> ApprovedGates, int Tokens,
    int LoopCount = 0, List<string>? Answers = null);

public static class WorkflowParser
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static readonly GuardrailsDef DefaultGuardrails =
        new(3, 8, null, 600_000, "verifier-must-pass", "pause", null, []);

    private static readonly StageDef[] DefaultStages =
    [
        new("plan", "Plan", "analyst", "inherit", "Break the requirement into a concrete, ordered implementation plan.", [], [], null, null, false),
        new("act", "Act", "developer", "inherit", "Implement the plan. Produce the actual changes and explain what was done.", [], [], null, null, false),
        new("verify", "Verify", "reviewer", "inherit", "Review the work against the requirement and list any high-confidence issues.", [], [], null, null, false),
        new("decide", "Decide", "reviewer", "inherit", "Summarize the outcome and decide whether the requirement is satisfied.", [], [], null, null, false),
    ];

    public static WorkflowDef Resolve(string workflowJson, string? packManifestJson, string fallbackName)
    {
        var fromWorkflow = TryParse(workflowJson, fallbackName);
        if (fromWorkflow is not null && fromWorkflow.Stages.Count > 0) return fromWorkflow;

        var fromPack = TryParse(packManifestJson, fallbackName);
        if (fromPack is not null && fromPack.Stages.Count > 0) return fromPack;

        return new WorkflowDef(fallbackName, DefaultStages, DefaultGuardrails);
    }

    private static WorkflowDef? TryParse(string? json, string fallbackName)
    {
        if (string.IsNullOrWhiteSpace(json) || json.Trim() is "{}" or "[]") return null;
        try
        {
            var root = JsonSerializer.Deserialize<JsonElement>(json, Json);
            if (root.ValueKind != JsonValueKind.Object) return null;
            if (!root.TryGetProperty("stages", out var stagesEl) || stagesEl.ValueKind != JsonValueKind.Array) return null;

            var stages = new List<StageDef>();
            foreach (var s in stagesEl.EnumerateArray())
            {
                var id = Str(s, "id");
                if (id.Length == 0) continue;
                stages.Add(new StageDef(
                    id,
                    Str(s, "title", id),
                    Str(s, "agent", "developer"),
                    Str(s, "model", "inherit"),
                    Str(s, "instruction", Str(s, "description")),
                    StrArray(s, "skills"),
                    StrArray(s, "tools"),
                    Opt(s, "verify"),
                    Opt(s, "gate"),
                    Bool(s, "parallel")));
            }
            if (stages.Count == 0) return null;

            var name = Str(root, "name", Str(root, "title", fallbackName));
            var guardrails = ParseGuardrails(root);
            return new WorkflowDef(name, stages, guardrails);
        }
        catch { return null; }
    }

    private static GuardrailsDef ParseGuardrails(JsonElement root)
    {
        if (!root.TryGetProperty("guardrails", out var g) || g.ValueKind != JsonValueKind.Object)
            return DefaultGuardrails;

        long? budget = null;
        if (g.TryGetProperty("budget", out var b) && b.ValueKind == JsonValueKind.Object
            && b.TryGetProperty("tokens", out var t) && t.ValueKind == JsonValueKind.Number)
            budget = t.GetInt64();

        return new GuardrailsDef(
            Int(g, "maxRetries", 3),
            Int(g, "maxLoopDepth", 8),
            budget,
            Int(g, "stageTimeoutMs", 600_000),
            Str(g, "qualityThreshold", "verifier-must-pass"),
            Str(g, "onBreach", "pause"),
            Opt(g, "fallbackModel"),
            StrArray(g, "requireHumanGate"));
    }

    private static string Str(JsonElement el, string prop, string fallback = "")
        => el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString()! : fallback;

    private static string? Opt(JsonElement el, string prop)
        => el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String && v.GetString()!.Length > 0 ? v.GetString() : null;

    private static int Int(JsonElement el, string prop, int fallback)
        => el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.Number ? v.GetInt32() : fallback;

    private static bool Bool(JsonElement el, string prop)
        => el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.True;

    private static IReadOnlyList<string> StrArray(JsonElement el, string prop)
        => el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.Array
            ? v.EnumerateArray().Where(x => x.ValueKind == JsonValueKind.String).Select(x => x.GetString()!).ToList()
            : [];
}
