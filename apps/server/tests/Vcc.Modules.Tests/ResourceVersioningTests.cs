using System.Text;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence;
using Vcc.Packages.Bundles;
using Vcc.Packages.Contracts;
using Vcc.Packages.Services;
using Vcc.Shared.Application.Common;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Modules.Tests;

public sealed class ResourceVersioningTests : IDisposable
{
    private sealed class FakeFetcher : IBundleFetcher
    {
        public Task<IReadOnlyList<FetchedFile>> FetchAsync(string kind, string name, string source, CancellationToken ct)
            => Task.FromResult<IReadOnlyList<FetchedFile>>([]);
    }

    private sealed class FakeFeatures : IFeatureFlags
    {
        public Task<IReadOnlyList<FeatureState>> ListAsync(CancellationToken ct) => Task.FromResult<IReadOnlyList<FeatureState>>([]);
        public Task<FeatureState?> GetAsync(string key, CancellationToken ct) => Task.FromResult<FeatureState?>(null);
        public Task<bool> IsAvailableAsync(string key, CancellationToken ct) => Task.FromResult(true);
        public Task<FeatureState?> SetEnabledAsync(string key, bool enabled, CancellationToken ct) => Task.FromResult<FeatureState?>(null);
        public Task<IReadOnlyList<CapabilityState>> CapabilitiesAsync(CancellationToken ct) => Task.FromResult<IReadOnlyList<CapabilityState>>([]);
    }

    private readonly string _root = Path.Combine(Path.GetTempPath(), "vcc-version-tests", Guid.NewGuid().ToString("N"));
    private readonly BundleStore _bundleStore;
    private readonly ResourceStore _resourceStore;
    private readonly SqliteConnection _conn;
    private readonly VccDbContext _db;

    public ResourceVersioningTests()
    {
        Directory.CreateDirectory(_root);
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["BUNDLES_CACHE"] = Path.Combine(_root, "cache"),
            ["VCC_GLOBAL_ROOT"] = Path.Combine(_root, "global"),
        }).Build();
        _bundleStore = new BundleStore(config, NullLogger<BundleStore>.Instance);
        _resourceStore = new ResourceStore(config, _bundleStore);
        _conn = new SqliteConnection("DataSource=:memory:");
        _conn.Open();
        _db = new VccDbContext(new DbContextOptionsBuilder<VccDbContext>().UseSqlite(_conn).Options);
        _db.Database.EnsureCreated();
    }

    private async Task WriteArchive(string archive, params (string path, string content)[] files)
        => await _bundleStore.WriteArchiveAsync(archive, files.Select(f => new FetchedFile(f.path, Encoding.UTF8.GetBytes(f.content))).ToList(), CancellationToken.None);

    private void AddBundle(string key, string version, string kind, string name, string archive, string[] entries, int stars = 0, string[]? tags = null, string description = "")
    {
        _db.Bundles.Add(new Bundle
        {
            Id = version == "1.0.0" ? key : $"{key}@{version}",
            Key = key, Version = version, Kind = kind, Name = name, Archive = archive, Stars = stars,
            Description = description, Tags = JsonSerializer.Serialize(tags ?? []),
            Meta = JsonSerializer.Serialize(new BundleMeta([], entries, null)),
        });
    }

    [Fact]
    public void Provides_ParsesSkillAgentCommand_IgnoresOthers()
    {
        var provided = _resourceStore.Provides(
            [".claude/skills/api-design/SKILL.md", ".claude/agents/reviewer.md", ".claude/commands/new-x.md", "README.md"]);

        Assert.Contains(provided, p => p is { Kind: "skill", Name: "api-design" });
        Assert.Contains(provided, p => p is { Kind: "agent", Name: "reviewer" });
        Assert.Contains(provided, p => p is { Kind: "command", Name: "new-x" });
        Assert.DoesNotContain(provided, p => p.Name == "README");
    }

    [Fact]
    public async Task Ensure_ExtractsOnce_AndIsImmutable()
    {
        await WriteArchive("b.tar.gz", (".claude/skills/x/SKILL.md", "v1"));
        _resourceStore.Ensure("skill-x", "1.0.0", "b.tar.gz");
        var file = Path.Combine(_resourceStore.VersionDir("skill-x", "1.0.0"), ".claude", "skills", "x", "SKILL.md");
        Assert.Equal("v1", File.ReadAllText(file));

        await WriteArchive("b.tar.gz", (".claude/skills/x/SKILL.md", "v2"));
        _resourceStore.Ensure("skill-x", "1.0.0", "b.tar.gz");

        Assert.Equal("v1", File.ReadAllText(file));
    }

    [Fact]
    public async Task Snapshot_ResolvesLatestVersion_ByDefault()
    {
        await WriteArchive("x1.tar.gz", (".claude/skills/x/SKILL.md", "one"));
        await WriteArchive("x2.tar.gz", (".claude/skills/x/SKILL.md", "two"));
        AddBundle("skill-x", "1.0.0", "skill", "X", "x1.tar.gz", [".claude/skills/x/SKILL.md"]);
        AddBundle("skill-x", "2.0.0", "skill", "X", "x2.tar.gz", [".claude/skills/x/SKILL.md"]);
        await _db.SaveChangesAsync();

        var provider = new ResourceSnapshotProvider(_db, _db, _resourceStore);
        var snapshot = Parse(await provider.BuildAsync("proj", "", ["x"], [], CancellationToken.None));

        Assert.Equal("2.0.0", snapshot.Skills["x"].Version);
        Assert.Equal("two", File.ReadAllText(snapshot.Skills["x"].Path));
    }

    [Fact]
    public async Task Snapshot_HonorsProjectPin_OverLatest()
    {
        await WriteArchive("x1.tar.gz", (".claude/skills/x/SKILL.md", "one"));
        await WriteArchive("x2.tar.gz", (".claude/skills/x/SKILL.md", "two"));
        AddBundle("skill-x", "1.0.0", "skill", "X", "x1.tar.gz", [".claude/skills/x/SKILL.md"]);
        AddBundle("skill-x", "2.0.0", "skill", "X", "x2.tar.gz", [".claude/skills/x/SKILL.md"]);
        _db.CatalogItems.Add(new CatalogItem { ProjectId = "proj", Kind = "skill", Key = "skill-x", Version = "1.0.0", Pinned = true });
        await _db.SaveChangesAsync();

        var provider = new ResourceSnapshotProvider(_db, _db, _resourceStore);
        var snapshot = Parse(await provider.BuildAsync("proj", "", ["x"], [], CancellationToken.None));

        Assert.Equal("1.0.0", snapshot.Skills["x"].Version);
        Assert.Equal("one", File.ReadAllText(snapshot.Skills["x"].Path));
    }

    [Fact]
    public async Task Search_RanksNameMatch_AndFiltersByKind()
    {
        AddBundle("skill-alpha", "1.0.0", "skill", "Alpha", "", [], stars: 1, tags: ["frontend"], description: "a tool");
        AddBundle("skill-beta", "1.0.0", "skill", "Beta", "", [], stars: 50, description: "mentions alpha in body");
        AddBundle("agent-alpha", "1.0.0", "agent", "Alpha Agent", "", [], stars: 1);
        await _db.SaveChangesAsync();

        var svc = new MarketplaceService(_db, _db, _bundleStore, _resourceStore, new FakeFetcher(), Config(), new FakeFeatures());
        var results = await svc.SearchAsync(new MarketplaceQuery("alpha", "skill", null, null, 0, 0), CancellationToken.None);

        Assert.All(results, r => Assert.Equal("skill", r.Kind));
        Assert.Equal("skill-alpha", results[0].Id);
        Assert.Contains(results, r => r.Id == "skill-beta");
    }

    [Fact]
    public async Task Search_ReportsInstalledVersion_AndUpdateAvailable()
    {
        AddBundle("skill-x", "1.0.0", "skill", "X", "", []);
        AddBundle("skill-x", "2.0.0", "skill", "X", "", []);
        _db.CatalogItems.Add(new CatalogItem { ProjectId = "proj", Kind = "skill", Key = "skill-x", Version = "1.0.0", Pinned = false });
        await _db.SaveChangesAsync();

        var svc = new MarketplaceService(_db, _db, _bundleStore, _resourceStore, new FakeFetcher(), Config(), new FakeFeatures());
        var results = await svc.SearchAsync(new MarketplaceQuery(null, null, null, "proj", 0, 0), CancellationToken.None);
        var item = results.Single(r => r.Id == "skill-x");

        Assert.Equal("2.0.0", item.Version);
        Assert.Equal("1.0.0", item.InstalledVersion);
        Assert.True(item.UpdateAvailable);
        Assert.Contains("2.0.0", item.Versions);
        Assert.Contains("1.0.0", item.Versions);
    }

    private IConfiguration Config() => new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
    {
        ["BUNDLES_CACHE"] = Path.Combine(_root, "cache"),
        ["VCC_GLOBAL_ROOT"] = Path.Combine(_root, "global"),
    }).Build();

    private static ResourceSnapshot Parse(string json)
        => JsonSerializer.Deserialize<ResourceSnapshot>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;

    public void Dispose()
    {
        _db.Dispose();
        _conn.Dispose();
        try { Directory.Delete(_root, recursive: true); } catch { }
    }
}
