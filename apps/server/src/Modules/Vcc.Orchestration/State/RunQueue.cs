using System.Threading.Channels;

namespace Vcc.Orchestration.State;

public interface IRunQueue
{
    void Signal();
    Task WaitAsync(TimeSpan timeout, CancellationToken ct);
}

public sealed class RunQueue : IRunQueue
{
    private readonly Channel<byte> _wake =
        Channel.CreateBounded<byte>(new BoundedChannelOptions(1) { FullMode = BoundedChannelFullMode.DropWrite });

    public void Signal() => _wake.Writer.TryWrite(0);

    public async Task WaitAsync(TimeSpan timeout, CancellationToken ct)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(timeout);
        try { await _wake.Reader.ReadAsync(cts.Token); }
        catch (OperationCanceledException) { }
    }
}
