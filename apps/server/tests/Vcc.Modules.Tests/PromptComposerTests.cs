using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Vcc.Orchestration.Context;
using Vcc.Orchestration.Workflow;
using Vcc.Shared.Application.Common;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Modules.Tests;

public sealed class PromptComposerTests : IDisposable
{
    private sealed class NullMemory : IMemoryStore
    {
        public Task<IReadOnlyList<MemoryItem>> ListAsync(string projectId, CancellationToken ct) => Task.FromResult<IReadOnlyList<MemoryItem>>([]);
        public Task<MemoryItem> UpsertAsync(string projectId, string scope, string key, string content, CancellationToken ct) => throw new NotSupportedException();
        public Task<bool> DeleteAsync(string id, CancellationToken ct) => Task.FromResult(false);
        public Task<string> RecallAsync(string projectId, int maxChars, CancellationToken ct) => Task.FromResult("");
    }

    private readonly string _root = Path.Combine(Path.GetTempPath(), "vcc-composer-tests", Guid.NewGuid().ToString("N"));
    private readonly PromptComposer _composer;

    public PromptComposerTests()
    {
        foreach (var s in new[] { "a-skill", "b-skill" })
        {
            var dir = Path.Combine(_root, ".claude", "skills", s);
            Directory.CreateDirectory(dir);
            File.WriteAllText(Path.Combine(dir, "SKILL.md"), $"content of {s}");
        }
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["VCC_GLOBAL_ROOT"] = Path.Combine(_root, "__no_global__") })
            .Build();
        var resolver = new WorkspaceResolver(config);
        _composer = new PromptComposer(resolver, new AgentResolver(resolver), new NullMemory());
    }

    private static StageDef Stage() =>
        new("act", "Act", "developer", "inherit", "do the thing", ["b-skill", "a-skill"], [], null, null, false);

    private ExecutionState State(string context, List<string>? answers) =>
        new("build a login form", "sonnet", _root, 0, context, [], 0, 0, answers);

    [Fact]
    public async Task SystemPrefix_IsByteStable_AcrossVolatileChanges()
    {
        var wf = new WorkflowDef("wf", [Stage()], WorkflowParser.DefaultGuardrails);
        var a = await _composer.ComposeAsync(State("", null), Stage(), wf, CancellationToken.None);
        var b = await _composer.ComposeAsync(State("prior stage output here", ["human said hurry"]), Stage(), wf, CancellationToken.None);

        Assert.Equal(a.System, b.System);          // cacheable prefix unchanged
        Assert.NotEqual(a.User, b.User);            // volatile tail differs
    }

    [Fact]
    public async Task Skills_AreDeterministicallyOrdered()
    {
        var wf = new WorkflowDef("wf", [Stage()], WorkflowParser.DefaultGuardrails);
        var composed = await _composer.ComposeAsync(State("", null), Stage(), wf, CancellationToken.None);

        var skillsBlock = composed.System.Last();
        Assert.True(skillsBlock.IndexOf("a-skill", StringComparison.Ordinal) < skillsBlock.IndexOf("b-skill", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Requirement_LivesInSystem_NotUser()
    {
        var wf = new WorkflowDef("wf", [Stage()], WorkflowParser.DefaultGuardrails);
        var composed = await _composer.ComposeAsync(State("", null), Stage(), wf, CancellationToken.None);

        Assert.Contains("build a login form", composed.System[0]);
        Assert.DoesNotContain("build a login form", composed.User);
    }

    [Fact]
    public async Task Snapshot_OverridesLiveSkillFile()
    {
        var pinnedDir = Path.Combine(_root, "store", "skill-a", "1.0.0", ".claude", "skills", "a-skill");
        Directory.CreateDirectory(pinnedDir);
        var pinnedPath = Path.Combine(pinnedDir, "SKILL.md");
        File.WriteAllText(pinnedPath, "PINNED CONTENT");

        var snapshot = JsonSerializer.Serialize(new ResourceSnapshot(
            null,
            new Dictionary<string, ResourcePin> { ["a-skill"] = new("1.0.0", "", pinnedPath) },
            new Dictionary<string, ResourcePin>()), new JsonSerializerOptions(JsonSerializerDefaults.Web));

        var state = new ExecutionState("build a login form", "sonnet", _root, 0, "", [], 0, Snapshot: snapshot);
        var wf = new WorkflowDef("wf", [Stage()], WorkflowParser.DefaultGuardrails);
        var composed = await _composer.ComposeAsync(state, Stage(), wf, CancellationToken.None);

        var skillsBlock = composed.System.Last();
        Assert.Contains("PINNED CONTENT", skillsBlock);
        Assert.DoesNotContain("content of a-skill", skillsBlock);
        Assert.Contains("content of b-skill", skillsBlock);
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { }
    }
}
