using System.Text.Json;
using Vcc.Packages.Contracts;

namespace Vcc.Packages.Services;

public interface IPackService
{
    Task SeedAsync(CancellationToken ct);
    Task<IReadOnlyList<PackSummaryDto>> ListAsync(CancellationToken ct);
    Task<IReadOnlyList<ProjectPackSummaryDto>> ListForProjectAsync(string projectId, CancellationToken ct);
    Task<JsonElement?> GetManifestAsync(string name, CancellationToken ct);
    Task<(string packName, string installedVersion)?> InstallAsync(string name, string projectId, CancellationToken ct);
    Task<string> UninstallAsync(string name, string projectId, CancellationToken ct);
}
