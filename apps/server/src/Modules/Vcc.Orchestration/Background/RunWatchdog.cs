using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Vcc.Orchestration.State;

namespace Vcc.Orchestration.Background;

public sealed class RunWatchdog(IRunControl control, IConfiguration config, ILogger<RunWatchdog> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var maxMs = int.TryParse(config["MAX_RUN_DURATION_MS"], out var v) ? v : 1_800_000;
        var intervalMs = int.TryParse(config["RUN_WATCHDOG_INTERVAL_MS"], out var iv) ? iv : 60_000;
        var maxAge = TimeSpan.FromMilliseconds(maxMs);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(intervalMs, stoppingToken);
                var cancelled = control.ReapExpired(maxAge);
                if (cancelled > 0) logger.LogWarning("run watchdog cancelled {Count} run(s) exceeding {MaxMs}ms", cancelled, maxMs);
            }
        }
        catch (OperationCanceledException) { }
    }
}
