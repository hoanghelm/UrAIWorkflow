namespace Vcc.Shared.Application.Interfaces;

public interface IGitService
{
    Task<bool> IsRepositoryAsync(string path, CancellationToken ct);
    Task<CommandResult> RunAsync(string cwd, IReadOnlyList<string> args, CancellationToken ct);
    Task<CommandResult> CloneAsync(string gitUrl, string targetDir, CancellationToken ct);
}
