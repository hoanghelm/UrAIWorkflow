using Microsoft.Extensions.Configuration;

namespace Vcc.Orchestration.Context;

public interface IWorkspaceResolver
{
    string GlobalRoot { get; }
    IReadOnlyList<string> Roots(string projectRoot);
    string? ResolveFile(string projectRoot, string relativePath);
}

public sealed class WorkspaceResolver(IConfiguration config) : IWorkspaceResolver
{
    public string GlobalRoot =>
        config["VCC_GLOBAL_ROOT"] is { Length: > 0 } configured
            ? configured
            : Path.Combine(AppContext.BaseDirectory, "data", "global");

    public IReadOnlyList<string> Roots(string projectRoot)
    {
        var roots = new List<string>();
        if (!string.IsNullOrEmpty(projectRoot)) roots.Add(projectRoot);
        roots.Add(GlobalRoot);
        return roots;
    }

    public string? ResolveFile(string projectRoot, string relativePath)
    {
        foreach (var root in Roots(projectRoot))
        {
            var candidate = Path.Combine(root, relativePath);
            if (File.Exists(candidate)) return candidate;
        }
        return null;
    }
}
