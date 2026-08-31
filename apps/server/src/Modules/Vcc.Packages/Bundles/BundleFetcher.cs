using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;

namespace Vcc.Packages.Bundles;

public sealed class BundleFetcher(HttpClient http, IConfiguration config) : IBundleFetcher
{
    private static readonly string[] PluginDirs = [".claude-plugin/", "agents/", "commands/", "skills/", "hooks/"];
    private static readonly string[] PluginRootFiles = ["plugin.json", "README.md"];
    private static readonly Regex GithubRe = new(@"github\.com/([^/#?]+)/([^/#?]+)(?:/(?:tree|blob)/([^/]+)/(.+))?", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private sealed record Repo(string Owner, string Name, string? Branch, string? Subpath);

    public async Task<IReadOnlyList<FetchedFile>> FetchAsync(string kind, string name, string source, CancellationToken ct)
    {
        var repo = ParseGithub(source);
        if (repo is null) return [];

        if (kind == "plugin")
        {
            var files = await FetchPluginAsync(repo, ct);
            return files.Select(f => new FetchedFile($".claude/plugins/{name}/{f.path}", Encoding.UTF8.GetBytes(f.content))).ToList();
        }

        var content = await FetchContentAsync(repo, kind, name, ct);
        if (content is null) return [];
        return [new FetchedFile(TargetPath(kind, name), Encoding.UTF8.GetBytes(content))];
    }

    private static string TargetPath(string kind, string name) => kind switch
    {
        "skill" => $".claude/skills/{name}/SKILL.md",
        "agent" => $".claude/agents/{name}.md",
        "command" => $".claude/commands/{name}.md",
        _ => $".claude/{name}.md",
    };

    private static Repo? ParseGithub(string source)
    {
        if (string.IsNullOrEmpty(source)) return null;
        var m = GithubRe.Match(source);
        if (!m.Success) return null;
        var repo = m.Groups[2].Value;
        if (repo.EndsWith(".git", StringComparison.OrdinalIgnoreCase)) repo = repo[..^4];
        return new Repo(m.Groups[1].Value, repo, m.Groups[3].Success ? m.Groups[3].Value : null, m.Groups[4].Success ? m.Groups[4].Value : null);
    }

    private async Task<string?> FetchContentAsync(Repo repo, string kind, string name, CancellationToken ct)
    {
        var branches = repo.Branch is not null ? [repo.Branch] : new[] { "main", "master" };

        if (repo.Subpath is not null && repo.Subpath.EndsWith(".md", StringComparison.OrdinalIgnoreCase))
            foreach (var branch in branches)
            {
                var direct = await GetTextAsync(Raw(repo, branch, repo.Subpath), ct);
                if (direct is not null) return direct;
            }

        foreach (var branch in branches)
            foreach (var candidate in CandidatePaths(kind, name))
            {
                var full = repo.Subpath is not null ? $"{repo.Subpath.TrimEnd('/')}/{candidate}" : candidate;
                var hit = await GetTextAsync(Raw(repo, branch, full), ct);
                if (hit is not null) return hit;
            }

        foreach (var branch in branches)
        {
            var tree = await GetTreeAsync(repo, branch, ct);
            var files = tree.Where(p => p.EndsWith(".md", StringComparison.OrdinalIgnoreCase)).ToList();
            if (files.Count == 0) continue;
            var scoped = repo.Subpath is not null ? files.Where(f => f.StartsWith(repo.Subpath)).ToList() : files;
            var pool = scoped.Count > 0 ? scoped : files;

            var best = pool.Select(f => (path: f, value: Score(f, kind, name))).Where(x => x.value > 0)
                .OrderByDescending(x => x.value).FirstOrDefault();
            if (best.path is not null)
            {
                var hit = await GetTextAsync(Raw(repo, branch, best.path), ct);
                if (hit is not null) return hit;
            }
        }
        return null;
    }

    private async Task<List<(string path, string content)>> FetchPluginAsync(Repo repo, CancellationToken ct)
    {
        var branches = repo.Branch is not null ? [repo.Branch] : new[] { "main", "master" };
        foreach (var branch in branches)
        {
            var paths = await GetTreeAsync(repo, branch, ct);
            if (paths.Count == 0) continue;
            if (!paths.Contains(".claude-plugin/plugin.json") && !paths.Contains("plugin.json")) return [];

            var wanted = paths.Where(p => PluginDirs.Any(d => p.StartsWith(d)) || PluginRootFiles.Contains(p)).ToList();
            var files = new List<(string, string)>();
            foreach (var p in wanted)
            {
                var content = await GetTextAsync(Raw(repo, branch, p), ct);
                if (content is not null) files.Add((p, content));
            }
            if (files.Count > 0) return files;
        }
        return [];
    }

    private static IReadOnlyList<string> CandidatePaths(string kind, string name) => kind switch
    {
        "skill" => [$".claude/skills/{name}/SKILL.md", $"skills/{name}/SKILL.md", "SKILL.md", "README.md"],
        "agent" => [$".claude/agents/{name}.md", $"agents/{name}.md", $"{name}.md", "README.md"],
        "command" => [$".claude/commands/{name}.md", $"commands/{name}.md", $"{name}.md", "README.md"],
        _ => ["README.md"],
    };

    private static int Score(string filePath, string kind, string name)
    {
        var p = filePath.ToLowerInvariant();
        var n = name.ToLowerInvariant();
        if (kind == "skill")
        {
            if (p == $".claude/skills/{n}/skill.md") return 100;
            if (p.EndsWith($"/skills/{n}/skill.md")) return 90;
            if (p.EndsWith($"/{n}/skill.md")) return 80;
            if (p.EndsWith("skill.md")) return 40;
        }
        else if (kind == "agent")
        {
            if (p == $".claude/agents/{n}.md") return 100;
            if (p.EndsWith($"/agents/{n}.md")) return 90;
            if (p.EndsWith($"/{n}.md")) return 60;
        }
        else if (kind == "command")
        {
            if (p.EndsWith($"/commands/{n}.md")) return 90;
            if (p.EndsWith($"/{n}.md")) return 60;
        }
        if (p.EndsWith("readme.md")) return 30 - p.Split('/').Length;
        return 0;
    }

    private static string Raw(Repo repo, string branch, string filePath)
        => $"https://raw.githubusercontent.com/{repo.Owner}/{repo.Name}/{branch}/{filePath.TrimStart('/')}";

    private async Task<string?> GetTextAsync(string url, CancellationToken ct)
    {
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            AddHeaders(req);
            using var resp = await http.SendAsync(req, ct);
            if (!resp.IsSuccessStatusCode) return null;
            var body = await resp.Content.ReadAsStringAsync(ct);
            return string.IsNullOrWhiteSpace(body) ? null : body;
        }
        catch { return null; }
    }

    private async Task<List<string>> GetTreeAsync(Repo repo, string branch, CancellationToken ct)
    {
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, $"https://api.github.com/repos/{repo.Owner}/{repo.Name}/git/trees/{branch}?recursive=1");
            AddHeaders(req);
            using var resp = await http.SendAsync(req, ct);
            if (!resp.IsSuccessStatusCode) return [];
            var doc = await resp.Content.ReadFromJsonElementAsync(ct);
            if (!doc.TryGetProperty("tree", out var tree) || tree.ValueKind != JsonValueKind.Array) return [];
            return tree.EnumerateArray()
                .Where(t => t.TryGetProperty("type", out var ty) && ty.GetString() == "blob" && t.TryGetProperty("path", out _))
                .Select(t => t.GetProperty("path").GetString()!)
                .ToList();
        }
        catch { return []; }
    }

    private void AddHeaders(HttpRequestMessage req)
    {
        req.Headers.UserAgent.ParseAdd("vcc-workflow");
        var token = config["GITHUB_TOKEN"];
        if (!string.IsNullOrEmpty(token)) req.Headers.TryAddWithoutValidation("Authorization", $"Bearer {token}");
    }
}

internal static class HttpContentJsonExtensions
{
    public static async Task<JsonElement> ReadFromJsonElementAsync(this HttpContent content, CancellationToken ct)
    {
        await using var stream = await content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        return doc.RootElement.Clone();
    }
}
