using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Vcc.Packages.Bundles;

namespace Vcc.Modules.Tests;

public sealed class BundleStoreTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "vcc-store-tests", Guid.NewGuid().ToString("N"));
    private readonly BundleStore _store;

    public BundleStoreTests()
    {
        Directory.CreateDirectory(_root);
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["BUNDLES_CACHE"] = Path.Combine(_root, "cache") })
            .Build();
        _store = new BundleStore(config, NullLogger<BundleStore>.Instance);
    }

    private async Task WriteAsync(string archive, params (string path, string content)[] files)
        => await _store.WriteArchiveAsync(archive, files.Select(f => new FetchedFile(f.path, System.Text.Encoding.UTF8.GetBytes(f.content))).ToList(), CancellationToken.None);

    [Fact]
    public async Task WriteThenExtract_RoundTripsContent()
    {
        await WriteAsync("bundle.tar.gz", (".claude/skills/x/SKILL.md", "hello world"));
        var dest = Path.Combine(_root, "proj");

        var result = _store.ExtractInto("bundle.tar.gz", dest);

        Assert.True(result.Success);
        Assert.Equal(1, result.FilesWritten);
        var file = Path.Combine(dest, ".claude", "skills", "x", "SKILL.md");
        Assert.True(File.Exists(file));
        Assert.Equal("hello world", File.ReadAllText(file));
    }

    [Fact]
    public async Task ExtractInto_BlocksParentDirectoryTraversal()
    {
        await WriteAsync("evil.tar.gz", ("../escape.txt", "pwned"), (".claude/ok.txt", "fine"));
        var dest = Path.Combine(_root, "proj");

        var result = _store.ExtractInto("evil.tar.gz", dest);

        Assert.True(result.Success);
        Assert.Equal(1, result.FilesWritten);
        Assert.False(File.Exists(Path.Combine(_root, "escape.txt")));
        Assert.True(File.Exists(Path.Combine(dest, ".claude", "ok.txt")));
    }

    [Fact]
    public async Task ExtractInto_BlocksSiblingPrefixEscape()
    {
        await WriteAsync("sibling.tar.gz", ("../proj-evil/x.txt", "pwned"));
        var dest = Path.Combine(_root, "proj");

        var result = _store.ExtractInto("sibling.tar.gz", dest);

        Assert.True(result.Success);
        Assert.Equal(0, result.FilesWritten);
        Assert.False(Directory.Exists(Path.Combine(_root, "proj-evil")));
    }

    [Fact]
    public void ExtractInto_ReturnsFailure_WhenArchiveMissing()
    {
        var result = _store.ExtractInto("does-not-exist.tar.gz", Path.Combine(_root, "proj"));

        Assert.False(result.Success);
        Assert.Contains("not found", result.Error);
    }

    [Fact]
    public async Task PrimaryContent_ReturnsNamedEntry()
    {
        await WriteAsync("mcp.tar.gz", (".claude/mcp/memory/server.mjs", "export const x = 1;"));

        var content = _store.PrimaryContent("mcp.tar.gz", ".claude/mcp/memory/server.mjs");

        Assert.Equal("export const x = 1;", content);
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { }
    }
}
