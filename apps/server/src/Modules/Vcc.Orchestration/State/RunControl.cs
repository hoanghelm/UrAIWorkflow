using System.Collections.Concurrent;

namespace Vcc.Orchestration.State;

public interface IRunControl
{
    CancellationTokenSource Register(string runId);
    bool Cancel(string runId);
    bool IsActive(string runId);
    void Remove(string runId);
    int ReapExpired(TimeSpan maxAge);
    IReadOnlyList<string> ActiveRuns();
}

public sealed class RunControl : IRunControl
{
    private sealed record Entry(CancellationTokenSource Cts, DateTime StartedAt);

    private readonly ConcurrentDictionary<string, Entry> _runs = new();

    public CancellationTokenSource Register(string runId)
    {
        var cts = new CancellationTokenSource();
        _runs.AddOrUpdate(runId, new Entry(cts, DateTime.UtcNow), (_, old) => { old.Cts.Cancel(); old.Cts.Dispose(); return new Entry(cts, DateTime.UtcNow); });
        return cts;
    }

    public bool Cancel(string runId)
    {
        if (_runs.TryGetValue(runId, out var e)) { e.Cts.Cancel(); return true; }
        return false;
    }

    public bool IsActive(string runId) => _runs.ContainsKey(runId);

    public void Remove(string runId)
    {
        if (_runs.TryRemove(runId, out var e)) e.Cts.Dispose();
    }

    public int ReapExpired(TimeSpan maxAge)
    {
        var now = DateTime.UtcNow;
        var count = 0;
        foreach (var (runId, entry) in _runs)
            if (now - entry.StartedAt > maxAge) { entry.Cts.Cancel(); count++; }
        return count;
    }

    public IReadOnlyList<string> ActiveRuns() => _runs.Keys.ToList();
}
