using Vcc.Shared.Application.Interfaces;

namespace Vcc.Terminal.Git;

public sealed class GitService(ICommandRunner runner) : IGitService
{
    private const string Git = "git";

    public Task<CommandResult> RunAsync(string cwd, IReadOnlyList<string> args, CancellationToken ct)
        => runner.RunAsync(Git, args, cwd, ct);

    public async Task<bool> IsRepositoryAsync(string path, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(path) || !Directory.Exists(path)) return false;
        var res = await RunAsync(path, ["rev-parse", "--is-inside-work-tree"], ct);
        return res.Success && res.Stdout.Trim() == "true";
    }

    public Task<CommandResult> CloneAsync(string gitUrl, string targetDir, CancellationToken ct)
        => runner.RunAsync(Git, ["clone", gitUrl, targetDir], Path.GetTempPath(), ct);
}
