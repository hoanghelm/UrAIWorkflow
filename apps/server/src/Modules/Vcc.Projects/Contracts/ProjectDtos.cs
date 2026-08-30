using System.Text.Json;

namespace Vcc.Projects.Contracts;

public sealed record ProjectDto(string Id, string Name, string Root, string Persona);

public sealed record ProjectSummaryDto(string Id, string Name, string Root, string Persona, IReadOnlyDictionary<string, int> Counts);

public sealed record CatalogItemDto(
    string Id, string Kind, string Name, string? Title, string? Description, string Scope,
    bool Builtin, string? Path, string? ProjectId, string Trust, string Version, string Source, JsonElement Meta);

public sealed record DiagramResult(string Mermaid);

public sealed record ExplainResult(string RunId, string Text);
