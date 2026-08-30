using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Terminal.Sessions;

public sealed class TerminalReaper(ITerminalSessionManager sessions, IConfiguration config, ILogger<TerminalReaper> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var maxAgeMs = int.TryParse(config["TERMINAL_MAX_LIFETIME_MS"], out var v) ? v : 600_000;
        var intervalMs = int.TryParse(config["TERMINAL_REAP_INTERVAL_MS"], out var iv) ? iv : 30_000;
        var maxAge = TimeSpan.FromMilliseconds(maxAgeMs);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(intervalMs, stoppingToken);
                var reaped = await sessions.ReapAsync(maxAge, stoppingToken);
                if (reaped > 0) logger.LogInformation("terminal reaper terminated {Count} stale session(s)", reaped);
            }
        }
        catch (OperationCanceledException) { }
        finally
        {
            await sessions.KillAllAsync(CancellationToken.None);
        }
    }
}
