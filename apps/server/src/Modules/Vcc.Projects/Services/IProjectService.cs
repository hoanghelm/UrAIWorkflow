using Vcc.Projects.Contracts;
using Vcc.Projects.Scanning;

namespace Vcc.Projects.Services;

public interface IProjectService
{
    Task<IReadOnlyList<ProjectDto>> ListAsync(CancellationToken ct);
    Task<IReadOnlyList<ProjectSummaryDto>> SummariesAsync(CancellationToken ct);
    Task<ProjectDto> RegisterAsync(RegisterProjectInput input, CancellationToken ct);
    Task<ProjectDto> CloneAsync(CloneProjectInput input, CancellationToken ct);
    Task<ProjectDto?> SetPersonaAsync(string id, string persona, CancellationToken ct);
    Task<bool> DeleteAsync(string id, CancellationToken ct);
    Task<IReadOnlyList<CatalogItemDto>> DiscoverAsync(string id, CancellationToken ct);
    Task<IReadOnlyList<CatalogItemDto>> CatalogAsync(string? projectId, CancellationToken ct);
    Task<bool> DeleteCatalogItemAsync(string id, CancellationToken ct);
    Task<IReadOnlyList<string>> FoldersAsync(string id, CancellationToken ct);
    Task<DiagramResult> DiagramAsync(string id, CancellationToken ct);
    Task<CodeGraph> CodeGraphAsync(string id, CancellationToken ct);
    Task<DiagramResult> CodeDiagramAsync(string id, string level, CancellationToken ct);
    Task<ExplainResult> ExplainAsync(string id, ExplainInput input, CancellationToken ct);
}
