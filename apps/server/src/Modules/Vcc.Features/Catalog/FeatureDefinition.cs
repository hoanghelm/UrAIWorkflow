namespace Vcc.Features.Catalog;

public sealed record FeatureDefinition(
    string Key,
    string Title,
    string Description,
    bool DefaultEnabled,
    IReadOnlyList<string> Requires);
