using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace Vcc.Orchestration.Telemetry;

public static class OrchestrationTelemetry
{
    public const string SourceName = "Vcc.Orchestration";

    public static readonly ActivitySource Activity = new(SourceName);

    private static readonly Meter Meter = new(SourceName);

    public static readonly Counter<long> RunsStarted = Meter.CreateCounter<long>("vcc.runs.started");
    public static readonly Counter<long> RunsCompleted = Meter.CreateCounter<long>("vcc.runs.completed");
    public static readonly Counter<long> RunsFailed = Meter.CreateCounter<long>("vcc.runs.failed");
    public static readonly Counter<long> StageLoops = Meter.CreateCounter<long>("vcc.stage.loops");
    public static readonly Histogram<int> StageTokens = Meter.CreateHistogram<int>("vcc.stage.tokens");
    public static readonly Histogram<double> StageDurationMs = Meter.CreateHistogram<double>("vcc.stage.duration.ms");
}
