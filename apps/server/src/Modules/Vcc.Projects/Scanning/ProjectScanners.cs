using System.Text.RegularExpressions;

namespace Vcc.Projects.Scanning;

public sealed record DiscoveredItem(string Kind, string Name, string Scope, string? Path, string? Description);

public sealed record CodeGraphNode(string Id, string Label, string Folder, bool Orphan, double X, double Y);
public sealed record CodeGraphEdge(string Id, string Source, string Target, bool Circular);
public sealed record CodeGraphStats(int Modules, int Edges, int Cycles, int Orphans, bool Truncated);
public sealed record CodeGraph(IReadOnlyList<CodeGraphNode> Nodes, IReadOnlyList<CodeGraphEdge> Edges, CodeGraphStats Stats);

internal static class CatalogScanner
{
    public static IReadOnlyList<DiscoveredItem> Scan(string root)
    {
        var items = new List<DiscoveredItem>();
        if (string.IsNullOrEmpty(root) || !Directory.Exists(root)) return items;

        var claude = Path.Combine(root, ".claude");
        ScanDir(items, Path.Combine(claude, "agents"), "agent", "project", "*.md");
        ScanDir(items, Path.Combine(claude, "commands"), "command", "project", "*.md");
        ScanDir(items, Path.Combine(claude, "rules"), "rule", "project", "*.md");
        ScanSkills(items, Path.Combine(claude, "skills"));

        var mcp = Path.Combine(root, ".mcp.json");
        if (File.Exists(mcp))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(File.ReadAllText(mcp));
                if (doc.RootElement.TryGetProperty("mcpServers", out var servers))
                    foreach (var s in servers.EnumerateObject())
                        items.Add(new DiscoveredItem("mcp", s.Name, "project", mcp, "MCP server"));
            }
            catch { }
        }

        var plugins = Path.Combine(claude, "plugins");
        if (Directory.Exists(plugins))
            foreach (var dir in Directory.EnumerateDirectories(plugins))
                items.Add(new DiscoveredItem("plugin", Path.GetFileName(dir), "project", dir, "Installed plugin"));

        return items;
    }

    private static void ScanDir(List<DiscoveredItem> items, string dir, string kind, string scope, string pattern)
    {
        if (!Directory.Exists(dir)) return;
        foreach (var file in Directory.EnumerateFiles(dir, pattern, SearchOption.TopDirectoryOnly))
            items.Add(new DiscoveredItem(kind, Path.GetFileNameWithoutExtension(file), scope, file, FirstHeading(file)));
    }

    private static void ScanSkills(List<DiscoveredItem> items, string dir)
    {
        if (!Directory.Exists(dir)) return;
        foreach (var sub in Directory.EnumerateDirectories(dir))
        {
            var skill = Path.Combine(sub, "SKILL.md");
            if (File.Exists(skill))
                items.Add(new DiscoveredItem("skill", Path.GetFileName(sub), "project", skill, FirstHeading(skill)));
        }
    }

    private static string? FirstHeading(string file)
    {
        try
        {
            foreach (var line in File.ReadLines(file).Take(20))
            {
                var t = line.TrimStart('#', ' ').Trim();
                if (line.StartsWith('#') && t.Length > 0) return t;
            }
        }
        catch { }
        return null;
    }
}

internal static class CodeGraphBuilder
{
    private static readonly string[] Extensions = [".ts", ".tsx", ".js", ".jsx", ".cs"];
    private static readonly Regex ImportRe = new(@"(?:import|from|require\()\s*['""]([^'""]+)['""]", RegexOptions.Compiled);
    private const int MaxFiles = 2000;

    public static IReadOnlyList<string> Folders(string root)
    {
        if (string.IsNullOrEmpty(root) || !Directory.Exists(root)) return [];
        var skip = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "node_modules", ".git", "dist", "bin", "obj", ".next", "coverage" };
        return Directory.EnumerateDirectories(root)
            .Select(Path.GetFileName)
            .Where(n => n is not null && !skip.Contains(n))
            .OrderBy(n => n)
            .Cast<string>()
            .ToList();
    }

    public static string FolderDiagram(string root)
    {
        var folders = Folders(root);
        var lines = new List<string> { "flowchart TD", "    root([" + SafeLabel(Path.GetFileName(root.TrimEnd('/', '\\')) ?? "project") + "])" };
        var i = 0;
        foreach (var f in folders)
        {
            lines.Add($"    f{i}[{SafeLabel(f)}]");
            lines.Add($"    root --> f{i}");
            i++;
        }
        return string.Join("\n", lines);
    }

    public static CodeGraph Build(string root)
    {
        if (string.IsNullOrEmpty(root) || !Directory.Exists(root))
            return new CodeGraph([], [], new CodeGraphStats(0, 0, 0, 0, false));

        var skip = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "node_modules", ".git", "dist", "bin", "obj", ".next", "coverage" };
        var files = new List<string>();
        var truncated = false;
        foreach (var file in EnumerateFiles(root, skip))
        {
            if (files.Count >= MaxFiles) { truncated = true; break; }
            if (Extensions.Contains(Path.GetExtension(file))) files.Add(file);
        }

        var folderOf = new Dictionary<string, string>();
        foreach (var file in files)
        {
            var rel = Path.GetRelativePath(root, file).Replace('\\', '/');
            var folder = rel.Contains('/') ? rel[..rel.IndexOf('/')] : ".";
            folderOf[rel] = folder;
        }

        var folders = folderOf.Values.Distinct().OrderBy(f => f).ToList();
        var edgeSet = new HashSet<(string, string)>();
        foreach (var file in files)
        {
            var rel = Path.GetRelativePath(root, file).Replace('\\', '/');
            var srcFolder = folderOf[rel];
            string content;
            try { content = File.ReadAllText(file); } catch { continue; }
            foreach (Match m in ImportRe.Matches(content))
            {
                var spec = m.Groups[1].Value;
                if (!spec.StartsWith('.')) continue;
                var targetFolder = ResolveFolder(rel, spec);
                if (targetFolder is not null && targetFolder != srcFolder && folders.Contains(targetFolder))
                    edgeSet.Add((srcFolder, targetFolder));
            }
        }

        var connected = new HashSet<string>();
        foreach (var (a, b) in edgeSet) { connected.Add(a); connected.Add(b); }

        var nodes = new List<CodeGraphNode>();
        var radius = 220.0;
        for (var i = 0; i < folders.Count; i++)
        {
            var angle = folders.Count == 0 ? 0 : 2 * Math.PI * i / folders.Count;
            nodes.Add(new CodeGraphNode(folders[i], folders[i], folders[i], !connected.Contains(folders[i]),
                Math.Round(300 + radius * Math.Cos(angle), 1), Math.Round(300 + radius * Math.Sin(angle), 1)));
        }

        var edges = new List<CodeGraphEdge>();
        var cycles = 0;
        var idx = 0;
        foreach (var (a, b) in edgeSet)
        {
            var circular = edgeSet.Contains((b, a));
            if (circular) cycles++;
            edges.Add(new CodeGraphEdge($"e{idx++}", a, b, circular));
        }

        var orphans = nodes.Count(n => n.Orphan);
        return new CodeGraph(nodes, edges, new CodeGraphStats(folders.Count, edges.Count, cycles / 2, orphans, truncated));
    }

    public static string GraphDiagram(string root, string level)
    {
        var graph = Build(root);
        var lines = new List<string> { "flowchart LR" };
        foreach (var n in graph.Nodes) lines.Add($"    {Sanitize(n.Id)}[{SafeLabel(n.Label)}]");
        foreach (var e in graph.Edges) lines.Add($"    {Sanitize(e.Source)} --> {Sanitize(e.Target)}");
        return string.Join("\n", lines);
    }

    private static IEnumerable<string> EnumerateFiles(string root, HashSet<string> skip)
    {
        var queue = new Queue<string>();
        queue.Enqueue(root);
        while (queue.Count > 0)
        {
            var dir = queue.Dequeue();
            IEnumerable<string> subs;
            try { subs = Directory.EnumerateDirectories(dir); } catch { continue; }
            foreach (var sub in subs)
                if (!skip.Contains(Path.GetFileName(sub))) queue.Enqueue(sub);
            IEnumerable<string> filesInDir;
            try { filesInDir = Directory.EnumerateFiles(dir); } catch { continue; }
            foreach (var f in filesInDir) yield return f;
        }
    }

    private static string? ResolveFolder(string relFile, string spec)
    {
        var baseDir = Path.GetDirectoryName(relFile)?.Replace('\\', '/') ?? "";
        var combined = Path.Combine(baseDir, spec).Replace('\\', '/');
        var normalized = NormalizePath(combined);
        return normalized.Contains('/') ? normalized[..normalized.IndexOf('/')] : ".";
    }

    private static string NormalizePath(string path)
    {
        var parts = new List<string>();
        foreach (var part in path.Split('/'))
        {
            if (part is "" or ".") continue;
            if (part == "..") { if (parts.Count > 0) parts.RemoveAt(parts.Count - 1); }
            else parts.Add(part);
        }
        return string.Join('/', parts);
    }

    private static string Sanitize(string s) => Regex.Replace(s, @"[^a-zA-Z0-9_]", "_");
    private static string SafeLabel(string s) => "\"" + s.Replace("\"", "'") + "\"";
}
