using System.Formats.Tar;
using System.IO.Compression;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Vcc.Packages.Common;

namespace Vcc.Packages.Bundles;

public sealed class BundleStore(IConfiguration config, ILogger<BundleStore> logger) : IBundleStore
{
    private static string SeededDir => Path.Combine(AppContext.BaseDirectory, "data", "bundles");
    private string CacheDir => config["BUNDLES_CACHE"] ?? Path.Combine(Path.GetTempPath(), "vcc-bundles");

    public IReadOnlyList<BundleEntry> ReadIndex()
    {
        var file = Path.Combine(SeededDir, "index.json");
        if (!File.Exists(file)) return [];
        try { return JsonSerializer.Deserialize<List<BundleEntry>>(File.ReadAllText(file), PackJson.Options) ?? []; }
        catch (Exception ex) { logger.LogError(ex, "Failed to read bundle index {File}", file); return []; }
    }

    private string? ResolveArchive(string archiveFile)
    {
        if (string.IsNullOrEmpty(archiveFile)) return null;
        var cached = Path.Combine(CacheDir, archiveFile);
        if (File.Exists(cached)) return cached;
        var seeded = Path.Combine(SeededDir, archiveFile);
        return File.Exists(seeded) ? seeded : null;
    }

    public string PrimaryContent(string archiveFile, string? primaryEntry)
    {
        if (string.IsNullOrEmpty(primaryEntry)) return "";
        var path = ResolveArchive(archiveFile);
        if (path is null) return "";
        var wanted = Normalize(primaryEntry);
        try
        {
            using var reader = OpenTar(path);
            while (reader.GetNextEntry() is { } entry)
            {
                if (entry.DataStream is null || Normalize(entry.Name) != wanted) continue;
                using var sr = new StreamReader(entry.DataStream, Encoding.UTF8);
                return sr.ReadToEnd();
            }
        }
        catch (Exception ex) { logger.LogWarning(ex, "Failed to read primary content from {Archive}", archiveFile); }
        return "";
    }

    public string ComputeHash(string archiveFile)
    {
        var path = ResolveArchive(archiveFile);
        if (path is null) return "";
        try
        {
            using var fs = File.OpenRead(path);
            return Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(fs))[..16];
        }
        catch (Exception ex) { logger.LogWarning(ex, "Failed to hash {Archive}", archiveFile); return ""; }
    }

    public ExtractResult ExtractInto(string archiveFile, string destRoot)
    {
        var path = ResolveArchive(archiveFile);
        if (path is null) return ExtractResult.Fail($"archive '{archiveFile}' not found");
        if (string.IsNullOrEmpty(destRoot)) return ExtractResult.Fail("destination root is empty");

        var fullDest = Path.TrimEndingDirectorySeparator(Path.GetFullPath(destRoot));
        var boundary = fullDest + Path.DirectorySeparatorChar;
        var written = 0;
        try
        {
            Directory.CreateDirectory(fullDest);
            using var reader = OpenTar(path);
            while (reader.GetNextEntry() is { } entry)
            {
                if (entry.EntryType is not (TarEntryType.RegularFile or TarEntryType.V7RegularFile)) continue;
                var rel = Normalize(entry.Name);
                if (rel.Length == 0) continue;

                var target = Path.GetFullPath(Path.Combine(fullDest, rel));
                if (target != fullDest && !target.StartsWith(boundary, StringComparison.OrdinalIgnoreCase))
                {
                    logger.LogWarning("Blocked path-traversal entry '{Entry}' in {Archive}", entry.Name, archiveFile);
                    continue;
                }

                Directory.CreateDirectory(Path.GetDirectoryName(target)!);
                entry.ExtractToFile(target, overwrite: true);
                written++;
            }
            return ExtractResult.Ok(written);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to extract {Archive} into {Dest}", archiveFile, destRoot);
            return ExtractResult.Fail($"extraction failed: {ex.Message}");
        }
    }

    public async Task<IReadOnlyList<string>> WriteArchiveAsync(string archiveFile, IReadOnlyList<FetchedFile> files, CancellationToken ct)
    {
        Directory.CreateDirectory(CacheDir);
        var path = Path.Combine(CacheDir, archiveFile);
        var entries = new List<string>();

        await using var fs = File.Create(path);
        await using var gz = new GZipStream(fs, CompressionLevel.Optimal);
        await using var tar = new TarWriter(gz, TarEntryFormat.Pax);
        foreach (var file in files)
        {
            var name = file.Path.Replace('\\', '/').TrimStart('/');
            if (name.Length == 0) continue;
            using var content = new MemoryStream(file.Content);
            await tar.WriteEntryAsync(new PaxTarEntry(TarEntryType.RegularFile, name) { DataStream = content }, ct);
            entries.Add(name);
        }
        return entries;
    }

    private static TarReader OpenTar(string path)
        => new(new GZipStream(File.OpenRead(path), CompressionMode.Decompress), leaveOpen: false);

    private static string Normalize(string entryName)
    {
        var rel = entryName.Replace('\\', '/');
        while (rel.StartsWith("./", StringComparison.Ordinal)) rel = rel[2..];
        return rel.TrimStart('/');
    }
}
