using Vcc.Connectors.Contracts;

namespace Vcc.Connectors.Services;

public interface IConnectorService
{
    Task<IReadOnlyList<ConnectorDto>> ListAsync(CancellationToken ct);
    Task<ConnectorDto> CreateAsync(CreateConnectorInput input, CancellationToken ct);
    Task<ConnectorDto?> ActivateAsync(string id, CancellationToken ct);
    Task<IReadOnlyList<ConnectorDto>> DeactivateAllAsync(CancellationToken ct);
    Task<bool> DeleteAsync(string id, CancellationToken ct);
    Task<(bool ok, string? error)> TestAsync(string id, CancellationToken ct);
    Task<ConnectorUsageDto> UsageAsync(CancellationToken ct);
    Task<string?> GetActiveForProjectAsync(string projectId, CancellationToken ct);
    Task<string> SetActiveForProjectAsync(string projectId, string connectorId, CancellationToken ct);
    Task ClearActiveForProjectAsync(string projectId, CancellationToken ct);
}
