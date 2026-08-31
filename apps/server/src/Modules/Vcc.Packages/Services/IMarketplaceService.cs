using Vcc.Packages.Contracts;

namespace Vcc.Packages.Services;

public interface IMarketplaceService
{
    Task SeedAsync(CancellationToken ct);
    Task<IReadOnlyList<MarketplaceItemDto>> ListAsync(CancellationToken ct);
    Task<IReadOnlyList<string>> InstallAsync(string projectId, string[] ids, CancellationToken ct);
}
