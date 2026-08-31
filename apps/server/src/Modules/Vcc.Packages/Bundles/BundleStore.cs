using System.Formats.Tar;
using System.IO.Compression;
using System.Text;
using System.Text.Json;
using Vcc.Packages.Common;

namespace Vcc.Packages.Bundles;

public sealed class BundleStore : IBundleStore
{
    private static string BundlesDir => Path.Combine(AppContext.BaseDirectory, "data", "bundles");

    public IReadOnlyList<BundleEntry> ReadIndex()
    {
        var file = Path.Combine(BundlesDir, "index.json");
        if (!File.Exists(file)) return [];
        try { return JsonSerializer.Deserialize<List<BundleEntry>>(File.ReadAllText(file), PackJson.Options) ?? []; }
        catch { return []; }
    }

    public string PrimaryContent(string archiveFile, string? primaryEntry)
    {
        if (string.IsNullOrEmpty(archiveFile) || string.IsNullOrEmpty(primaryEntry)) return "";
        var path = Path.Combine(BundlesDir, archiveFile);
        if (!File.Exists(path)) return "";
        var wanted = Normalize(primaryEntry);
        try
        {
            using var fs = File.OpenRead(path);
            using var gz = new GZipStream(fs, CompressionMode.Decompress);
            using var reader = new TarReader(gz);
            while (reader.GetNextEntry() is { } entry)
            {
                if (entry.DataStream is null) continue;
                if (Normalize(entry.Name) != wanted) continue;
                using var sr = new StreamReader(entry.DataStream, Encoding.UTF8);
                return sr.ReadToEnd();
            }
        }
        catch { }
        return "";
    }

    public bool ExtractInto(string archiveFile, string destRoot)
    {
        if (string.IsNullOrEmpty(archiveFile) || string.IsNullOrEmpty(destRoot)) return false;
        var path = Path.Combine(BundlesDir, archiveFile);
        if (!File.Exists(path)) return false;

        var fullDest = Path.GetFullPath(destRoot);
        try
        {
            Directory.CreateDirectory(fullDest);
            using var fs = File.OpenRead(path);
            using var gz = new GZipStream(fs, CompressionMode.Decompress);
            using var reader = new TarReader(gz);
            while (reader.GetNextEntry() is { } entry)
            {
                if (entry.EntryType is not (TarEntryType.RegularFile or TarEntryType.V7RegularFile)) continue;
                var rel = Normalize(entry.Name);
                if (rel.Length == 0) continue;

                var target = Path.GetFullPath(Path.Combine(fullDest, rel));
                if (!target.StartsWith(fullDest, StringComparison.OrdinalIgnoreCase)) continue;

                Directory.CreateDirectory(Path.GetDirectoryName(target)!);
                entry.ExtractToFile(target, overwrite: true);
            }
            return true;
        }
        catch { return false; }
    }

    private static string Normalize(string entryName)
    {
        var rel = entryName.Replace('\\', '/');
        while (rel.StartsWith("./", StringComparison.Ordinal)) rel = rel[2..];
        return rel.TrimStart('/');
    }
}
