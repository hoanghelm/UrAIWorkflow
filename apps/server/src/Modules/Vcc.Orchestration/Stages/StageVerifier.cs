using System.Runtime.InteropServices;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Orchestration.Stages;

public sealed record VerifyResult(bool Ok, string Detail);

public interface IStageVerifier
{
    Task<VerifyResult> VerifyAsync(string cwd, string kind, CancellationToken ct);
}

public sealed class StageVerifier(ICommandRunner runner) : IStageVerifier
{
    public async Task<VerifyResult> VerifyAsync(string cwd, string kind, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(cwd) || !Directory.Exists(cwd))
            return new VerifyResult(true, "no worktree; verification skipped");

        var command = Resolve(cwd, kind);
        if (command is null) return new VerifyResult(true, $"no {kind} command detected; skipped");

        var (file, args) = command.Value;
        var result = await runner.RunAsync(file, args, cwd, ct);
        return new VerifyResult(result.Success, $"{file} {string.Join(' ', args)} -> exit {result.ExitCode}\n{Tail(result.Combined)}");
    }

    private static (string file, IReadOnlyList<string> args)? Resolve(string cwd, string kind)
    {
        var tests = kind.Equals("tests", StringComparison.OrdinalIgnoreCase);
        var pkg = Path.Combine(cwd, "package.json");
        if (File.Exists(pkg))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(File.ReadAllText(pkg));
                if (doc.RootElement.TryGetProperty("scripts", out var scripts))
                {
                    var script = tests ? "test" : "build";
                    if (scripts.TryGetProperty(script, out _))
                        return (OnWindows("npm.cmd", "npm"), ["run", script, "--if-present"]);
                }
            }
            catch { }
        }

        if (Directory.EnumerateFiles(cwd, "*.csproj").Any() || Directory.EnumerateFiles(cwd, "*.sln").Any())
            return ("dotnet", tests ? ["test", "--nologo"] : ["build", "--nologo"]);

        return null;
    }

    private static string OnWindows(string win, string other)
        => RuntimeInformation.IsOSPlatform(OSPlatform.Windows) ? win : other;

    private static string Tail(string text)
    {
        var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        return string.Join("\n", lines.TakeLast(12));
    }
}
