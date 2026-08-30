namespace Vcc.Design.Common;

public static class DesignFormats
{
    public const string DefaultKind = "mockup";
    public const string Html = "html";
    public const string Mermaid = "mermaid";

    private static readonly HashSet<string> MermaidKinds = new(StringComparer.OrdinalIgnoreCase) { "flow", "diagram" };

    public static string ForKind(string kind) => MermaidKinds.Contains(kind) ? Mermaid : Html;
}
