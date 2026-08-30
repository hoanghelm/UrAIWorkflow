namespace Vcc.Shared.Application.Interfaces;

public interface IMetricsRecorder
{
    Task RecordAsync(string runId, string lever, int inputTokens, int outputTokens, CancellationToken ct);
}
