using System.Text;
using System.Text.Json;
using Vcc.Orchestration.Workflow;

namespace Vcc.Orchestration.Context;

public interface IPromptComposer
{
    Task<string> ComposeAsync(ExecutionState state, StageDef stage, WorkflowDef workflow, CancellationToken ct);
}

public sealed class PromptComposer : IPromptComposer
{
    private const int MaxSkillChars = 1500;

    public async Task<string> ComposeAsync(ExecutionState state, StageDef stage, WorkflowDef workflow, CancellationToken ct)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"You are the {stage.Agent} agent in the \"{workflow.Name}\" workflow.");
        sb.AppendLine($"Overall requirement: {state.Requirement}");
        sb.AppendLine($"Current stage: {stage.Title}");
        if (stage.Instruction.Length > 0) sb.AppendLine($"Instruction: {stage.Instruction}");

        foreach (var skill in stage.Skills)
        {
            var content = await LoadSkillAsync(state.ProjectRoot, skill, ct);
            if (content is not null)
            {
                sb.AppendLine();
                sb.AppendLine($"## Skill: {skill}");
                sb.AppendLine(content);
            }
            else
            {
                sb.AppendLine($"Apply skill: {skill}");
            }
        }

        if (stage.Tools.Count > 0) sb.AppendLine($"Tools available: {string.Join(", ", stage.Tools)}");

        var mcp = McpServers(state.ProjectRoot);
        if (mcp.Count > 0) sb.AppendLine($"MCP servers available: {string.Join(", ", mcp)}");

        if (state.Answers is { Count: > 0 })
        {
            sb.AppendLine();
            sb.AppendLine("Human guidance:");
            foreach (var answer in state.Answers) sb.AppendLine($"- {answer}");
        }

        if (state.Context.Length > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Prior stage results:");
            sb.AppendLine(state.Context);
        }

        return sb.ToString();
    }

    private static async Task<string?> LoadSkillAsync(string projectRoot, string skill, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(projectRoot)) return null;
        var path = Path.Combine(projectRoot, ".claude", "skills", skill, "SKILL.md");
        if (!File.Exists(path)) return null;
        try
        {
            var text = await File.ReadAllTextAsync(path, ct);
            return text.Length > MaxSkillChars ? text[..MaxSkillChars] : text;
        }
        catch { return null; }
    }

    private static IReadOnlyList<string> McpServers(string projectRoot)
    {
        if (string.IsNullOrEmpty(projectRoot)) return [];
        var path = Path.Combine(projectRoot, ".mcp.json");
        if (!File.Exists(path)) return [];
        try
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(path));
            if (doc.RootElement.TryGetProperty("mcpServers", out var servers) && servers.ValueKind == JsonValueKind.Object)
                return servers.EnumerateObject().Select(p => p.Name).ToList();
        }
        catch { }
        return [];
    }
}
