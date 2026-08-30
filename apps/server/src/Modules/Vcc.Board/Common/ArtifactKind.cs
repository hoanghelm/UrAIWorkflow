namespace Vcc.Board.Common;

public static class ArtifactKind
{
    public static string Classify(string file) => Path.GetExtension(file).TrimStart('.').ToLowerInvariant() switch
    {
        "html" or "htm" => "html",
        "css" => "css",
        "js" or "ts" or "tsx" or "jsx" => "script",
        "png" or "jpg" or "jpeg" or "svg" or "gif" => "image",
        "md" => "doc",
        _ => "file",
    };
}
