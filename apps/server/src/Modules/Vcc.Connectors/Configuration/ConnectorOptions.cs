namespace Vcc.Connectors.Configuration;

public sealed class ConnectorOptions
{
    public const string SectionName = "Connectors";

    public IReadOnlyList<string> AllowedModels { get; set; } = ["opus", "sonnet", "haiku"];
    public IReadOnlyList<string> AllowedProviders { get; set; } = ["claude-agent", "claude", "copilot"];
    public bool ConnectorsLocked { get; set; }
    public string DefaultProvider { get; set; } = "claude";

    public Dictionary<string, Dictionary<string, string>> DefaultModels { get; set; } = new()
    {
        ["claude"] = new() { ["opus"] = "claude-opus-4-8", ["sonnet"] = "claude-sonnet-5", ["haiku"] = "claude-haiku-4-5-20251001" },
        ["copilot"] = new() { ["opus"] = "gpt-4o", ["sonnet"] = "gpt-4o", ["haiku"] = "gpt-4o-mini" },
    };

    public Dictionary<string, string> ModelsFor(string provider)
        => DefaultModels.TryGetValue(provider, out var m) ? new Dictionary<string, string>(m) : new Dictionary<string, string>(DefaultModels["claude"]);
}
