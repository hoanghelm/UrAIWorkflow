using Vcc.Orchestration.State;

namespace Vcc.Modules.Tests;

public sealed class RunSerializerTests
{
    [Fact]
    public async Task ConcurrentOperations_OnSameRun_NeverOverlap()
    {
        var serializer = new RunSerializer();
        var active = 0;
        var overlapped = false;

        async Task Op()
        {
            if (Interlocked.Increment(ref active) != 1) overlapped = true;
            await Task.Delay(10);
            Interlocked.Decrement(ref active);
        }

        await Task.WhenAll(Enumerable.Range(0, 25).Select(_ => serializer.RunExclusiveAsync("run-1", Op, CancellationToken.None)));

        Assert.False(overlapped);
    }

    [Fact]
    public async Task DifferentRuns_RunConcurrently()
    {
        var serializer = new RunSerializer();
        var gate = new TaskCompletionSource();

        var a = serializer.RunExclusiveAsync("run-a", () => gate.Task, CancellationToken.None);
        var b = serializer.RunExclusiveAsync("run-b", () => Task.CompletedTask, CancellationToken.None);

        await b.WaitAsync(TimeSpan.FromSeconds(2));
        Assert.True(b.IsCompletedSuccessfully);
        gate.SetResult();
        await a;
    }
}
