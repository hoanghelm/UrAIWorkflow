namespace Vcc.Packages.Bundles;

public interface IBundleStore
{
    IReadOnlyList<BundleEntry> ReadIndex();
    string PrimaryContent(string archiveFile, string? primaryEntry);
    bool ExtractInto(string archiveFile, string destRoot);
}
