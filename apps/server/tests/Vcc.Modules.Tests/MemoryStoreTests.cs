using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Vcc.Infrastructure.Persistence;
using Vcc.Projects.Services;

namespace Vcc.Modules.Tests;

public sealed class MemoryStoreTests : IDisposable
{
    private readonly SqliteConnection _conn;
    private readonly VccDbContext _db;
    private readonly MemoryStore _store;

    public MemoryStoreTests()
    {
        _conn = new SqliteConnection("DataSource=:memory:");
        _conn.Open();
        var options = new DbContextOptionsBuilder<VccDbContext>().UseSqlite(_conn).Options;
        _db = new VccDbContext(options);
        _db.Database.EnsureCreated();
        _store = new MemoryStore(_db);
    }

    [Fact]
    public async Task Upsert_IsIdempotentPerKey_AndRecallFormatsProjectScope()
    {
        await _store.UpsertAsync("p1", "project", "stack", "dotnet 9 + react", CancellationToken.None);
        await _store.UpsertAsync("p1", "project", "stack", "dotnet 9 + react + sqlite", CancellationToken.None); // update same key
        await _store.UpsertAsync("p1", "project", "convention", "no code comments", CancellationToken.None);
        await _store.UpsertAsync("p2", "project", "other", "should not leak", CancellationToken.None);

        var list = await _store.ListAsync("p1", CancellationToken.None);
        Assert.Equal(2, list.Count); // stack updated in place, not duplicated

        var recall = await _store.RecallAsync("p1", 2000, CancellationToken.None);
        Assert.Contains("dotnet 9 + react + sqlite", recall);
        Assert.Contains("no code comments", recall);
        Assert.DoesNotContain("should not leak", recall); // project-scoped isolation
    }

    [Fact]
    public async Task Recall_EmptyForUnknownProject()
        => Assert.Equal("", await _store.RecallAsync("nope", 2000, CancellationToken.None));

    public void Dispose()
    {
        _db.Dispose();
        _conn.Dispose();
    }
}
