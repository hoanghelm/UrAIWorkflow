namespace Vcc.Packages.Bundles;

public sealed record FetchedFile(string Path, byte[] Content);

public interface IBundleFetcher
{
    // Returns the files to bundle, keyed by their target path inside a project
    // (e.g. ".claude/skills/<name>/SKILL.md"). Empty when nothing could be fetched.
    Task<IReadOnlyList<FetchedFile>> FetchAsync(string kind, string name, string source, CancellationToken ct);
}
