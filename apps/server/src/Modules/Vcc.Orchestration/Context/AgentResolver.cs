namespace Vcc.Orchestration.Context;

public interface IAgentResolver
{
    Task<string?> ResolveAsync(string projectRoot, string agent, string persona, CancellationToken ct);
}

public sealed class AgentResolver(IWorkspaceResolver resolver) : IAgentResolver
{
    private const int MaxAgentChars = 2000;

    public async Task<string?> ResolveAsync(string projectRoot, string agent, string persona, CancellationToken ct)
    {
        foreach (var key in Keys(agent, persona))
        {
            var path = resolver.ResolveFile(projectRoot, Path.Combine(".claude", "agents", key + ".md"));
            if (path is null) continue;
            try
            {
                var text = await File.ReadAllTextAsync(path, ct);
                return text.Length > MaxAgentChars ? text[..MaxAgentChars] : text;
            }
            catch { }
        }
        return null;
    }

    private static IEnumerable<string> Keys(string agent, string persona)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var key in new[] { agent, persona })
            if (!string.IsNullOrWhiteSpace(key) && seen.Add(key)) yield return key;
    }
}
