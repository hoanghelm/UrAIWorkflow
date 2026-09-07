using System.Text;
using System.Text.Json;
using Vcc.Orchestration.Workflow;
using Vcc.Shared.Application.Common;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Orchestration.Context;

public interface IPromptComposer
{
    Task<ComposedPrompt> ComposeAsync(ExecutionState state, StageDef stage, WorkflowDef workflow, CancellationToken ct);
}

public sealed class PromptComposer(IWorkspaceResolver resolver, IAgentResolver agents, IMemoryStore memory) : IPromptComposer
{
    private const int MaxSkillChars = 1500;
    private const int MaxAgentChars = 2000;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task<ComposedPrompt> ComposeAsync(ExecutionState state, StageDef stage, WorkflowDef workflow, CancellationToken ct)
    {
        var snapshot = ParseSnapshot(state.Snapshot);
        var system = new List<string>();

        var shared = new StringBuilder();
        shared.AppendLine($"You are an agent in the \"{workflow.Name}\" workflow.");
        shared.AppendLine($"Overall requirement: {state.Requirement}");
        var mcp = McpServers(state.ProjectRoot);
        if (mcp.Count > 0) shared.AppendLine($"MCP servers available: {string.Join(", ", mcp.OrderBy(x => x, StringComparer.Ordinal))}");
        system.Add(shared.ToString().TrimEnd());

        var recalled = await memory.RecallAsync(state.ProjectId, 2000, ct);
        if (!string.IsNullOrWhiteSpace(recalled)) system.Add($"# Project memory\n{recalled}");

        var agentDef = await ResolveAgentAsync(state, stage, snapshot, ct);
        if (!string.IsNullOrWhiteSpace(agentDef)) system.Add($"# Agent: {stage.Agent}\n{agentDef}");

        var skills = new StringBuilder();
        foreach (var skill in stage.Skills.OrderBy(x => x, StringComparer.Ordinal))
        {
            var content = await LoadSkillAsync(state.ProjectRoot, skill, snapshot, ct);
            if (content is not null)
            {
                skills.AppendLine($"## Skill: {skill}");
                skills.AppendLine(content);
                skills.AppendLine();
            }
            else
            {
                skills.AppendLine($"Apply skill: {skill}");
            }
        }
        if (skills.Length > 0) system.Add(skills.ToString().TrimEnd());

        var user = new StringBuilder();
        user.AppendLine($"You are the {stage.Agent} agent. Current stage: {stage.Title}.");
        if (stage.Instruction.Length > 0) user.AppendLine($"Instruction: {stage.Instruction}");
        if (stage.Tools.Count > 0) user.AppendLine($"Tools available: {string.Join(", ", stage.Tools)}");

        if (state.Answers is { Count: > 0 })
        {
            user.AppendLine();
            user.AppendLine("Human guidance:");
            foreach (var answer in state.Answers) user.AppendLine($"- {answer}");
        }

        if (state.Context.Length > 0)
        {
            user.AppendLine();
            user.AppendLine("Prior stage results:");
            user.AppendLine(state.Context);
        }

        return new ComposedPrompt(system, user.ToString().TrimEnd());
    }

    private async Task<string?> ResolveAgentAsync(ExecutionState state, StageDef stage, ResourceSnapshot? snapshot, CancellationToken ct)
    {
        if (snapshot is not null && snapshot.Agents.TryGetValue(stage.Agent, out var pin) && File.Exists(pin.Path))
        {
            var pinned = await ReadTruncatedAsync(pin.Path, MaxAgentChars, ct);
            if (pinned is not null) return pinned;
        }
        return await agents.ResolveAsync(state.ProjectRoot, stage.Agent, state.Persona, ct);
    }

    private async Task<string?> LoadSkillAsync(string projectRoot, string skill, ResourceSnapshot? snapshot, CancellationToken ct)
    {
        if (snapshot is not null && snapshot.Skills.TryGetValue(skill, out var pin) && File.Exists(pin.Path))
        {
            var pinned = await ReadTruncatedAsync(pin.Path, MaxSkillChars, ct);
            if (pinned is not null) return pinned;
        }
        var path = resolver.ResolveFile(projectRoot, Path.Combine(".claude", "skills", skill, "SKILL.md"));
        return path is null ? null : await ReadTruncatedAsync(path, MaxSkillChars, ct);
    }

    private static async Task<string?> ReadTruncatedAsync(string path, int max, CancellationToken ct)
    {
        try
        {
            var text = await File.ReadAllTextAsync(path, ct);
            return text.Length > max ? text[..max] : text;
        }
        catch { return null; }
    }

    private static ResourceSnapshot? ParseSnapshot(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<ResourceSnapshot>(json, Json); }
        catch { return null; }
    }

    private IReadOnlyList<string> McpServers(string projectRoot)
    {
        var names = new List<string>();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var root in resolver.Roots(projectRoot))
        {
            var path = Path.Combine(root, ".mcp.json");
            if (!File.Exists(path)) continue;
            try
            {
                using var doc = JsonDocument.Parse(File.ReadAllText(path));
                if (doc.RootElement.TryGetProperty("mcpServers", out var servers) && servers.ValueKind == JsonValueKind.Object)
                    foreach (var p in servers.EnumerateObject())
                        if (seen.Add(p.Name)) names.Add(p.Name);
            }
            catch { }
        }
        return names;
    }
}
