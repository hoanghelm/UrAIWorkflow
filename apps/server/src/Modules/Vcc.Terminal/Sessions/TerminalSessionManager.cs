using System.Collections.Concurrent;
using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Threading.Channels;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Terminal.Sessions;

internal sealed class ProcessSession
{
    public required string Id { get; init; }
    public required string Command { get; init; }
    public required Process Process { get; init; }
    public required Channel<string> Output { get; init; }
    public DateTime StartedAt { get; } = DateTime.UtcNow;
}

public sealed class TerminalSessionManager : ITerminalSessionManager
{
    private readonly ConcurrentDictionary<string, ProcessSession> _sessions = new();

    public Task<string> StartAsync(TerminalSpec spec, CancellationToken ct)
    {
        var id = Guid.NewGuid().ToString("n");
        var psi = new ProcessStartInfo
        {
            FileName = spec.Command,
            WorkingDirectory = Directory.Exists(spec.Cwd) ? spec.Cwd : Directory.GetCurrentDirectory(),
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            RedirectStandardInput = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        foreach (var arg in spec.Args) psi.ArgumentList.Add(arg);
        if (spec.Env is not null)
            foreach (var (k, v) in spec.Env) psi.Environment[k] = v;

        var process = new Process { StartInfo = psi, EnableRaisingEvents = true };
        var channel = Channel.CreateUnbounded<string>();
        var session = new ProcessSession { Id = id, Command = spec.Command, Process = process, Output = channel };

        process.OutputDataReceived += (_, e) => { if (e.Data is not null) channel.Writer.TryWrite(e.Data); };
        process.ErrorDataReceived += (_, e) => { if (e.Data is not null) channel.Writer.TryWrite(e.Data); };
        process.Exited += (_, _) => channel.Writer.TryComplete();

        process.Start();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();
        _sessions[id] = session;
        return Task.FromResult(id);
    }

    public async IAsyncEnumerable<string> StreamAsync(string sessionId, [EnumeratorCancellation] CancellationToken ct)
    {
        if (!_sessions.TryGetValue(sessionId, out var session)) yield break;
        try
        {
            await foreach (var line in session.Output.Reader.ReadAllAsync(ct))
                yield return line;
        }
        finally
        {
            Terminate(session);
            _sessions.TryRemove(sessionId, out _);
        }
    }

    public Task WriteAsync(string sessionId, string input, CancellationToken ct)
    {
        if (_sessions.TryGetValue(sessionId, out var session) && !session.Process.HasExited)
            return session.Process.StandardInput.WriteLineAsync(input);
        return Task.CompletedTask;
    }

    public Task KillAsync(string sessionId, CancellationToken ct)
    {
        if (_sessions.TryRemove(sessionId, out var session)) Terminate(session);
        return Task.CompletedTask;
    }

    public IReadOnlyList<TerminalSessionInfo> ActiveSessions()
        => _sessions.Values.Select(s => new TerminalSessionInfo(s.Id, s.Command, s.StartedAt, SafeExited(s.Process))).ToList();

    public Task<int> ReapAsync(TimeSpan maxAge, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var reaped = 0;
        foreach (var (id, session) in _sessions)
        {
            var expired = now - session.StartedAt > maxAge;
            if (expired || SafeExited(session.Process))
            {
                if (_sessions.TryRemove(id, out var removed)) { Terminate(removed); reaped++; }
            }
        }
        return Task.FromResult(reaped);
    }

    public Task KillAllAsync(CancellationToken ct)
    {
        foreach (var (id, _) in _sessions)
            if (_sessions.TryRemove(id, out var removed)) Terminate(removed);
        return Task.CompletedTask;
    }

    private static void Terminate(ProcessSession session)
    {
        try { if (!session.Process.HasExited) session.Process.Kill(entireProcessTree: true); } catch { }
        session.Output.Writer.TryComplete();
        try { session.Process.Dispose(); } catch { }
    }

    private static bool SafeExited(Process process)
    {
        try { return process.HasExited; } catch { return true; }
    }
}
