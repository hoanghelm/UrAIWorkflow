namespace Vcc.Packages.Bundles;

public sealed record McpServer(string Name, string Command, IReadOnlyList<string> Args, IReadOnlyDictionary<string, string>? Env = null);

public sealed record BundleEntry(
    string Id, string Kind, string Name, string Description, string Author,
    IReadOnlyList<string> Tags, int Stars, string Source,
    string? Archive, IReadOnlyList<string>? Entries, IReadOnlyList<string>? Members, McpServer? Mcp,
    string? Version = null);

public sealed record BundleMeta(IReadOnlyList<string> Members, IReadOnlyList<string> Entries, McpServer? Mcp);
