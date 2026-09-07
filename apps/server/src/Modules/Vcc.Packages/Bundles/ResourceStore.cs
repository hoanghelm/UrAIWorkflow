using Microsoft.Extensions.Configuration;

namespace Vcc.Packages.Bundles;

public sealed class ResourceStore(IConfiguration config, IBundleStore bundles) : IResourceStore
{
    private string GlobalRoot =>
        config["VCC_GLOBAL_ROOT"] is { Length: > 0 } configured ? configured : Path.Combine(AppContext.BaseDirectory, "data", "global");

    public string StoreRoot => Path.Combine(GlobalRoot, "store");

    public string VersionDir(string key, string version) => Path.Combine(StoreRoot, key, version);

    public void Ensure(string key, string version, string archiveFile)
    {
        if (string.IsNullOrEmpty(key) || string.IsNullOrEmpty(archiveFile)) return;
        var dir = VersionDir(key, version);
        if (Directory.Exists(dir)) return;
        bundles.ExtractInto(archiveFile, dir);
    }

    public IReadOnlyList<ProvidedResource> Provides(IReadOnlyList<string> entries)
    {
        var provided = new List<ProvidedResource>();
        foreach (var raw in entries)
        {
            var rel = raw.Replace('\\', '/').TrimStart('/');
            var parts = rel.Split('/');
            if (parts.Length >= 4 && parts[0] == ".claude" && parts[1] == "skills" && parts[^1] == "SKILL.md")
                provided.Add(new ProvidedResource("skill", parts[2], rel));
            else if (parts.Length == 3 && parts[0] == ".claude" && parts[1] == "agents" && rel.EndsWith(".md", StringComparison.OrdinalIgnoreCase))
                provided.Add(new ProvidedResource("agent", Path.GetFileNameWithoutExtension(parts[2]), rel));
            else if (parts.Length == 3 && parts[0] == ".claude" && parts[1] == "commands" && rel.EndsWith(".md", StringComparison.OrdinalIgnoreCase))
                provided.Add(new ProvidedResource("command", Path.GetFileNameWithoutExtension(parts[2]), rel));
        }
        return provided;
    }
}
