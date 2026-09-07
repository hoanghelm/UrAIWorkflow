using Vcc.Packages.Contracts;

namespace Vcc.Packages.Services;

public interface IMarketplaceService
{
    Task SeedAsync(CancellationToken ct);
    Task MaterializeGlobalAsync(string globalRoot, CancellationToken ct);
    Task<IReadOnlyList<MarketplaceItemDto>> ListAsync(CancellationToken ct);
    Task<IReadOnlyList<MarketplaceItemDto>> SearchAsync(MarketplaceQuery query, CancellationToken ct);
    Task<MarketplaceItemDto?> ImportAsync(string source, string kind, string? name, CancellationToken ct);
    Task<InstallOutcome> InstallAsync(string projectId, string[] ids, CancellationToken ct);
    Task<string?> PinAsync(string projectId, string key, string? version, CancellationToken ct);
    Task<bool> UnpinAsync(string projectId, string key, CancellationToken ct);
}
