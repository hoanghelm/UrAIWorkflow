namespace Vcc.Shared.Application.Interfaces;

public interface IRunNotifier
{
    Task RunEventAsync(string runId, object payload, CancellationToken ct);
    Task RunDeltaAsync(string runId, string stageId, string delta, CancellationToken ct);
    Task RunTraceAsync(string runId, string stageId, string trace, CancellationToken ct);
    Task BoardChangedAsync(string projectId, CancellationToken ct);
}
