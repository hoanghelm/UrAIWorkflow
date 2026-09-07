namespace Vcc.Packages.Bundles;

public interface IResourceStore
{
    string StoreRoot { get; }
    string VersionDir(string key, string version);
    void Ensure(string key, string version, string archiveFile);
    IReadOnlyList<ProvidedResource> Provides(IReadOnlyList<string> entries);
}
