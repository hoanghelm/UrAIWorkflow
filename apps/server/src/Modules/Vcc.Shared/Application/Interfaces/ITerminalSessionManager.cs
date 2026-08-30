namespace Vcc.Shared.Application.Interfaces;

public sealed record TerminalSpec(string Command, IReadOnlyList<string> Args, string Cwd, IReadOnlyDictionary<string, string>? Env);

public sealed record TerminalSessionInfo(string Id, string Command, DateTime StartedAt, bool Exited);

public interface ITerminalSessionManager
{
    Task<string> StartAsync(TerminalSpec spec, CancellationToken ct);
    IAsyncEnumerable<string> StreamAsync(string sessionId, CancellationToken ct);
    Task WriteAsync(string sessionId, string input, CancellationToken ct);
    Task KillAsync(string sessionId, CancellationToken ct);
    IReadOnlyList<TerminalSessionInfo> ActiveSessions();
    Task<int> ReapAsync(TimeSpan maxAge, CancellationToken ct);
    Task KillAllAsync(CancellationToken ct);
}
