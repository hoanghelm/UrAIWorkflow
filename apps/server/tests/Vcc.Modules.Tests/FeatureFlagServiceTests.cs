using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Vcc.Features.Capabilities;
using Vcc.Features.Services;
using Vcc.Infrastructure.Persistence;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Modules.Tests;

public sealed class FeatureFlagServiceTests : IDisposable
{
    private sealed class FakeInspector(params (string id, bool present)[] caps) : ICapabilityInspector
    {
        public Task<IReadOnlyDictionary<string, CapabilityState>> InspectAsync(CancellationToken ct)
            => Task.FromResult<IReadOnlyDictionary<string, CapabilityState>>(
                caps.ToDictionary(c => c.id, c => new CapabilityState(c.id, c.id, c.present, null)));
    }

    private readonly SqliteConnection _conn;
    private readonly VccDbContext _db;

    public FeatureFlagServiceTests()
    {
        _conn = new SqliteConnection("DataSource=:memory:");
        _conn.Open();
        _db = new VccDbContext(new DbContextOptionsBuilder<VccDbContext>().UseSqlite(_conn).Options);
        _db.Database.EnsureCreated();
    }

    private FeatureFlagService Service(params (string, bool)[] caps) => new(_db, new FakeInspector(caps));

    [Fact]
    public async Task Available_When_Enabled_And_CapabilitiesPresent()
    {
        var svc = Service(("node", true), ("playwright-browsers", true));
        var f = await svc.GetAsync("browser-automation", CancellationToken.None);
        Assert.NotNull(f);
        Assert.True(f!.Enabled);
        Assert.True(f.Available);
        Assert.Empty(f.Missing);
    }

    [Fact]
    public async Task NotAvailable_And_ReportsMissing_When_CapabilityAbsent()
    {
        var svc = Service(("node", true), ("playwright-browsers", false));
        var f = await svc.GetAsync("browser-automation", CancellationToken.None);
        Assert.True(f!.Enabled);
        Assert.False(f.Available);
        Assert.Contains("playwright-browsers", f.Missing);
    }

    [Fact]
    public async Task Override_Disables_An_Otherwise_Available_Feature()
    {
        var svc = Service(("node", true));
        Assert.True((await svc.GetAsync("js-mcp-servers", CancellationToken.None))!.Available);

        await svc.SetEnabledAsync("js-mcp-servers", false, CancellationToken.None);

        var f = await svc.GetAsync("js-mcp-servers", CancellationToken.None);
        Assert.False(f!.Enabled);
        Assert.False(f.Available);
        Assert.Empty(f.Missing);
    }

    [Fact]
    public async Task Override_Enable_StillBlocked_When_CapabilityMissing()
    {
        var svc = Service(("uv", false));
        await svc.SetEnabledAsync("python-mcp-servers", true, CancellationToken.None);

        var f = await svc.GetAsync("python-mcp-servers", CancellationToken.None);
        Assert.True(f!.Enabled);
        Assert.False(f.Available);
        Assert.Contains("uv", f.Missing);
    }

    [Fact]
    public async Task Unknown_Feature_Returns_Null()
        => Assert.Null(await Service().SetEnabledAsync("does-not-exist", true, CancellationToken.None));

    public void Dispose()
    {
        _db.Dispose();
        _conn.Dispose();
    }
}
