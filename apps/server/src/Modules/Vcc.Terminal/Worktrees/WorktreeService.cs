using Microsoft.Extensions.Configuration;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Terminal.Worktrees;

public sealed class WorktreeService(IGitService git, IConfiguration config) : IWorktreeService
{
    private const string BranchPrefix = "vcc/";
    private const int MaxScannedFiles = 500;

    private string Root => config["WORKSPACES_ROOT"] ?? Path.Combine(Path.GetTempPath(), "vcc-workspaces");

    public async Task<WorktreeInfo> CreateAsync(string projectRoot, string runId, CancellationToken ct)
    {
        Directory.CreateDirectory(Root);
        var path = Path.Combine(Root, runId);

        if (!string.IsNullOrEmpty(projectRoot) && await git.IsRepositoryAsync(projectRoot, ct))
        {
            var branch = BranchPrefix + runId;
            var res = await git.RunAsync(projectRoot, ["worktree", "add", "-b", branch, path, "HEAD"], ct);
            if (res.Success) return new WorktreeInfo(path, branch, true);
        }

        Directory.CreateDirectory(path);
        return new WorktreeInfo(path, null, false);
    }

    public async Task<IReadOnlyList<WorktreeChange>> ChangesAsync(string worktreePath, CancellationToken ct)
        => await git.IsRepositoryAsync(worktreePath, ct)
            ? await GitChangesAsync(worktreePath, ct)
            : FileChanges(worktreePath);

    public async Task<WorktreeDiff> DiffAsync(string worktreePath, CancellationToken ct)
    {
        if (!await git.IsRepositoryAsync(worktreePath, ct))
            return new WorktreeDiff("", FileChanges(worktreePath), "", worktreePath);

        var patch = (await git.RunAsync(worktreePath, ["diff", "HEAD"], ct)).Stdout;
        var branch = (await git.RunAsync(worktreePath, ["rev-parse", "--abbrev-ref", "HEAD"], ct)).Stdout.Trim();
        var files = await GitChangesAsync(worktreePath, ct);
        return new WorktreeDiff(patch, files, branch, worktreePath);
    }

    public async Task<WorktreeCommit> CommitAsync(string worktreePath, string message, CancellationToken ct)
    {
        if (!await git.IsRepositoryAsync(worktreePath, ct))
            return new WorktreeCommit(false, "", null, "no git worktree");

        await git.RunAsync(worktreePath, ["add", "-A"], ct);
        var status = await git.RunAsync(worktreePath, ["status", "--porcelain"], ct);
        var branch = (await git.RunAsync(worktreePath, ["rev-parse", "--abbrev-ref", "HEAD"], ct)).Stdout.Trim();
        if (string.IsNullOrWhiteSpace(status.Stdout))
            return new WorktreeCommit(false, branch, null, "nothing to commit");

        await git.RunAsync(worktreePath, ["commit", "-m", message], ct);
        var sha = (await git.RunAsync(worktreePath, ["rev-parse", "HEAD"], ct)).Stdout.Trim();
        return new WorktreeCommit(true, branch, sha, message);
    }

    public async Task RemoveAsync(string worktreePath, CancellationToken ct)
    {
        try
        {
            if (await git.IsRepositoryAsync(worktreePath, ct))
            {
                var branch = (await git.RunAsync(worktreePath, ["rev-parse", "--abbrev-ref", "HEAD"], ct)).Stdout.Trim();
                var commonDir = (await git.RunAsync(worktreePath, ["rev-parse", "--path-format=absolute", "--git-common-dir"], ct)).Stdout.Trim();
                var mainRoot = ResolveMainRoot(worktreePath, commonDir);
                if (mainRoot is not null)
                {
                    await git.RunAsync(mainRoot, ["worktree", "remove", "--force", worktreePath], ct);
                    if (branch.StartsWith(BranchPrefix)) await git.RunAsync(mainRoot, ["branch", "-D", branch], ct);
                }
            }
        }
        catch { }

        try { if (Directory.Exists(worktreePath)) Directory.Delete(worktreePath, recursive: true); } catch { }
    }

    private async Task<IReadOnlyList<WorktreeChange>> GitChangesAsync(string worktreePath, CancellationToken ct)
    {
        var status = await git.RunAsync(worktreePath, ["status", "--porcelain=v1", "--untracked-files=all"], ct);
        var numstat = await git.RunAsync(worktreePath, ["diff", "HEAD", "--numstat"], ct);
        var counts = ParseNumstat(numstat.Stdout);

        var changes = new List<WorktreeChange>();
        foreach (var line in status.Stdout.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            if (line.Length < 3) continue;
            var code = line[..2];
            var rest = line[3..].Trim();
            var path = rest.Contains(" -> ") ? rest[(rest.IndexOf(" -> ", StringComparison.Ordinal) + 4)..] : rest;
            path = path.Trim('"');
            var kind = Classify(code);
            var (add, del) = counts.TryGetValue(path, out var c) ? c : (0, 0);
            changes.Add(new WorktreeChange(path, kind, add, del));
        }
        return changes;
    }

    private static ChangeKind Classify(string code)
    {
        if (code.Contains('R')) return ChangeKind.Renamed;
        if (code.Contains('D')) return ChangeKind.Deleted;
        if (code.Contains('A') || code == "??") return ChangeKind.Added;
        return ChangeKind.Modified;
    }

    private static Dictionary<string, (int add, int del)> ParseNumstat(string numstat)
    {
        var map = new Dictionary<string, (int, int)>();
        foreach (var line in numstat.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            var parts = line.Split('\t');
            if (parts.Length < 3) continue;
            var add = int.TryParse(parts[0], out var a) ? a : 0;
            var del = int.TryParse(parts[1], out var d) ? d : 0;
            map[parts[2].Trim().Trim('"')] = (add, del);
        }
        return map;
    }

    private IReadOnlyList<WorktreeChange> FileChanges(string worktreePath)
    {
        if (string.IsNullOrEmpty(worktreePath) || !Directory.Exists(worktreePath)) return [];
        var changes = new List<WorktreeChange>();
        try
        {
            foreach (var file in Directory.EnumerateFiles(worktreePath, "*", SearchOption.AllDirectories).Take(MaxScannedFiles))
            {
                if (file.Replace('\\', '/').Contains("/.git/")) continue;
                changes.Add(new WorktreeChange(Path.GetRelativePath(worktreePath, file).Replace('\\', '/'), ChangeKind.Added, 0, 0));
            }
        }
        catch { }
        return changes;
    }

    private static string? ResolveMainRoot(string worktreePath, string commonDir)
    {
        if (string.IsNullOrEmpty(commonDir)) return null;
        var abs = Path.IsPathRooted(commonDir) ? commonDir : Path.GetFullPath(Path.Combine(worktreePath, commonDir));
        return Directory.GetParent(abs.TrimEnd('/', '\\'))?.FullName;
    }
}
