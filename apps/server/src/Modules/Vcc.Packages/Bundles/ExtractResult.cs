namespace Vcc.Packages.Bundles;

public sealed record ExtractResult(bool Success, int FilesWritten, string? Error)
{
    public static ExtractResult Ok(int filesWritten) => new(true, filesWritten, null);
    public static ExtractResult Fail(string error) => new(false, 0, error);
}
