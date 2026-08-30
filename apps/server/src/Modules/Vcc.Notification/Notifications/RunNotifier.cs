using Microsoft.AspNetCore.SignalR;
using Vcc.Notification.Hubs;
using Vcc.Notification.State;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Notification.Notifications;

public sealed class RunNotifier(IHubContext<RunsHub> hub, ILiveStateStore store) : IRunNotifier
{
    public Task RunEventAsync(string runId, object payload, CancellationToken ct)
    {
        store.Set($"run:{runId}", payload);
        return hub.Clients.All.SendAsync("run.event", new { runId, payload }, ct);
    }

    public Task RunDeltaAsync(string runId, string stageId, string delta, CancellationToken ct)
        => hub.Clients.All.SendAsync("run.delta", new { runId, stageId, delta }, ct);

    public Task RunTraceAsync(string runId, string stageId, string trace, CancellationToken ct)
        => hub.Clients.All.SendAsync("run.trace", new { runId, stageId, trace }, ct);

    public Task BoardChangedAsync(string projectId, CancellationToken ct)
        => hub.Clients.All.SendAsync("board.changed", new { projectId }, ct);
}
