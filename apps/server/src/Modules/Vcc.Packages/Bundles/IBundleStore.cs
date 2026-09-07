namespace Vcc.Packages.Bundles;

public interface IBundleStore
{
    IReadOnlyList<BundleEntry> ReadIndex();
    string PrimaryContent(string archiveFile, string? primaryEntry);
    string ComputeHash(string archiveFile);
    ExtractResult ExtractInto(string archiveFile, string destRoot);
    Task<IReadOnlyList<string>> WriteArchiveAsync(string archiveFile, IReadOnlyList<FetchedFile> files, CancellationToken ct);
}
