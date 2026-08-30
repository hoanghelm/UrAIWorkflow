namespace Vcc.Packages.Contracts;

public sealed record PackSummaryDto(
    string Id, string Name, string Title, string Version, string Description,
    IReadOnlyList<string> Roles, IReadOnlyList<string> Tags, string Trust, bool Installed);

public sealed record ProjectPackSummaryDto(
    string Id, string Name, string Title, string Version, string Description,
    IReadOnlyList<string> Roles, IReadOnlyList<string> Tags, string Trust, bool Installed,
    string? InstalledVersion, string LatestVersion, bool UpdateAvailable);

public sealed record MarketplaceItemDto(
    string Id, string Kind, string Name, string Description, string Author, IReadOnlyList<string> Tags,
    int Stars, string Source, string Install, IReadOnlyList<string> Bundle, string Content);
