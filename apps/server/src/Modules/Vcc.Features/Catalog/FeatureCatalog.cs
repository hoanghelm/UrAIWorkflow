namespace Vcc.Features.Catalog;

public static class FeatureCatalog
{
    public static readonly IReadOnlyList<FeatureDefinition> All =
    [
        new("browser-automation", "Browser automation",
            "Playwright browser control and web testing MCP server.", true, ["node", "playwright-browsers"]),
        new("js-mcp-servers", "JavaScript MCP servers",
            "Vendored Node MCP servers (memory, filesystem, github, postgres, sequential-thinking, everything).", true, ["node"]),
        new("python-mcp-servers", "Python MCP servers",
            "git / fetch / time MCP servers, launched via uv.", false, ["uv"]),
        new("git-worktrees", "Git worktrees",
            "Isolated per-run git worktrees for the runner.", true, ["git"]),
        new("desktop-shell", "Desktop shell",
            "Windows WebView2 desktop application.", true, ["webview2"]),
        new("marketplace-import", "Marketplace import",
            "Fetch new bundles from GitHub into the catalog.", true, []),
    ];

    public static FeatureDefinition? Find(string key) => All.FirstOrDefault(f => f.Key == key);
}
