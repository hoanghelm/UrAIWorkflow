using System.Diagnostics;
using Vcc.Orchestration.State;

namespace Vcc.Modules.Tests;

public sealed class RunQueueTests
{
    [Fact]
    public async Task WaitAsync_ReturnsPromptly_WhenSignaled()
    {
        var queue = new RunQueue();
        queue.Signal();
        var sw = Stopwatch.StartNew();
        await queue.WaitAsync(TimeSpan.FromSeconds(5), CancellationToken.None);
        sw.Stop();
        Assert.True(sw.ElapsedMilliseconds < 1000, $"expected prompt wake, took {sw.ElapsedMilliseconds}ms");
    }

    [Fact]
    public async Task WaitAsync_ReturnsOnTimeout_WhenNoSignal()
    {
        var queue = new RunQueue();
        var sw = Stopwatch.StartNew();
        await queue.WaitAsync(TimeSpan.FromMilliseconds(150), CancellationToken.None);
        sw.Stop();
        Assert.True(sw.ElapsedMilliseconds >= 100, $"expected to wait out the timeout, took {sw.ElapsedMilliseconds}ms");
    }

    [Fact]
    public async Task Signals_Collapse_AndDoNotAccumulate()
    {
        var queue = new RunQueue();
        queue.Signal();
        queue.Signal();
        queue.Signal();
        await queue.WaitAsync(TimeSpan.FromSeconds(5), CancellationToken.None);

        var sw = Stopwatch.StartNew();
        await queue.WaitAsync(TimeSpan.FromMilliseconds(150), CancellationToken.None);
        sw.Stop();
        Assert.True(sw.ElapsedMilliseconds >= 100, "extra signals should have collapsed, second wait must time out");
    }
}
