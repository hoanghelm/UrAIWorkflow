namespace Vcc.Shared.Application.Interfaces;

public sealed record CommandResult(int ExitCode, string Stdout, string Stderr, bool TimedOut)
{
    public bool Success => ExitCode == 0 && !TimedOut;
    public string Combined => string.Join("\n", new[] { Stdout, Stderr }.Where(s => s.Length > 0));
}

public interface ICommandRunner
{
    Task<CommandResult> RunAsync(string file, IReadOnlyList<string> args, string cwd, CancellationToken ct);
}
