using System.Diagnostics;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Terminal.Execution;

public sealed class CommandRunner : ICommandRunner
{
    public async Task<CommandResult> RunAsync(string file, IReadOnlyList<string> args, string cwd, CancellationToken ct)
    {
        var psi = new ProcessStartInfo(file)
        {
            WorkingDirectory = Directory.Exists(cwd) ? cwd : Directory.GetCurrentDirectory(),
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        foreach (var a in args) psi.ArgumentList.Add(a);

        using var proc = new Process { StartInfo = psi };
        try { proc.Start(); }
        catch (Exception ex) { return new CommandResult(-1, "", ex.Message, false); }

        var stdout = proc.StandardOutput.ReadToEndAsync(ct);
        var stderr = proc.StandardError.ReadToEndAsync(ct);
        try
        {
            await proc.WaitForExitAsync(ct);
        }
        catch (OperationCanceledException)
        {
            try { if (!proc.HasExited) proc.Kill(entireProcessTree: true); } catch { }
            throw;
        }

        return new CommandResult(proc.ExitCode, await stdout, await stderr, false);
    }
}
