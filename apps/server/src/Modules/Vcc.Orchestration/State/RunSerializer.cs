using System.Collections.Concurrent;

namespace Vcc.Orchestration.State;

public interface IRunSerializer
{
    Task<T> RunExclusiveAsync<T>(string runId, Func<Task<T>> operation, CancellationToken ct);
    Task RunExclusiveAsync(string runId, Func<Task> operation, CancellationToken ct);
}

public sealed class RunSerializer : IRunSerializer
{
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _gates = new();

    public async Task<T> RunExclusiveAsync<T>(string runId, Func<Task<T>> operation, CancellationToken ct)
    {
        var gate = _gates.GetOrAdd(runId, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(ct);
        try { return await operation(); }
        finally { gate.Release(); }
    }

    public Task RunExclusiveAsync(string runId, Func<Task> operation, CancellationToken ct)
        => RunExclusiveAsync(runId, async () => { await operation(); return true; }, ct);
}
