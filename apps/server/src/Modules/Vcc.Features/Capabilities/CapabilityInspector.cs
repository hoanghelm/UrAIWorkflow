using Microsoft.Extensions.Configuration;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Features.Capabilities;

public interface ICapabilityInspector
{
    Task<IReadOnlyDictionary<string, CapabilityState>> InspectAsync(CancellationToken ct);
}

public sealed class CapabilityInspector(IConfiguration config) : ICapabilityInspector
{
    private static readonly TimeSpan CacheFor = TimeSpan.FromSeconds(30);
    private readonly SemaphoreSlim _gate = new(1, 1);
    private IReadOnlyDictionary<string, CapabilityState>? _cache;
    private DateTime _cachedAt;

    public async Task<IReadOnlyDictionary<string, CapabilityState>> InspectAsync(CancellationToken ct)
    {
        if (_cache is not null && DateTime.UtcNow - _cachedAt < CacheFor) return _cache;
        await _gate.WaitAsync(ct);
        try
        {
            if (_cache is not null && DateTime.UtcNow - _cachedAt < CacheFor) return _cache;
            var map = new Dictionary<string, CapabilityState>
            {
                ["node"] = Exe("node", "Node.js runtime", "node"),
                ["uv"] = Exe("uv", "uv (Python runner)", "uv", "uvx"),
                ["git"] = Exe("git", "Git", "git"),
                ["webview2"] = WebView2(),
                ["playwright-browsers"] = PlaywrightBrowsers(),
            };
            _cache = map;
            _cachedAt = DateTime.UtcNow;
            return map;
        }
        finally
        {
            _gate.Release();
        }
    }

    private static CapabilityState Exe(string id, string title, params string[] names)
    {
        var found = FindOnPath(names);
        return new CapabilityState(id, title, found is not null, found);
    }

    private static string? FindOnPath(IReadOnlyList<string> names)
    {
        var pathVar = Environment.GetEnvironmentVariable("PATH") ?? "";
        var dirs = pathVar.Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var exts = OperatingSystem.IsWindows() ? new[] { ".exe", ".cmd", ".bat", "" } : new[] { "" };
        foreach (var dir in dirs)
            foreach (var name in names)
                foreach (var ext in exts)
                {
                    var candidate = Path.Combine(dir, name + ext);
                    if (File.Exists(candidate)) return candidate;
                }
        return null;
    }

    private static CapabilityState WebView2()
    {
        var candidates = new[]
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "EdgeWebView", "Application"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Microsoft", "EdgeWebView", "Application"),
        };
        var found = candidates.FirstOrDefault(d => !string.IsNullOrEmpty(d) && Directory.Exists(d) && Directory.EnumerateDirectories(d).Any());
        return new CapabilityState("webview2", "WebView2 runtime", found is not null, found);
    }

    private CapabilityState PlaywrightBrowsers()
    {
        var root = config["VCC_GLOBAL_ROOT"] is { Length: > 0 } configured ? configured : Path.Combine(AppContext.BaseDirectory, "data", "global");
        var dir = Path.Combine(root, ".claude", "mcp", "playwright", "browsers");
        var present = Directory.Exists(dir) && Directory.EnumerateDirectories(dir, "chromium*").Any();
        return new CapabilityState("playwright-browsers", "Playwright browsers", present, present ? dir : null);
    }
}
