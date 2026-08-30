using Vcc.Design.Contracts;

namespace Vcc.Design.Services;

public interface IDesignService
{
    Task<IReadOnlyList<DesignDto>> ListAsync(string projectId, CancellationToken ct);
    Task<DesignDto> CreateAsync(CreateDesignInput input, CancellationToken ct);
    Task<DesignDto?> GetAsync(string id, CancellationToken ct);
    Task<DesignDto?> UpdateAsync(string id, UpdateDesignInput input, CancellationToken ct);
    Task<bool> DeleteAsync(string id, CancellationToken ct);

    Task<IReadOnlyList<DesignArtifactDto>> ArtifactsAsync(string designId, CancellationToken ct);
    Task<DesignArtifactDto> CreateArtifactAsync(CreateDesignArtifactInput input, CancellationToken ct);
    Task<DesignArtifactDto?> GetArtifactAsync(string id, CancellationToken ct);
    Task<DesignArtifactDto?> UpdateArtifactAsync(string id, UpdateDesignArtifactInput input, CancellationToken ct);
    Task<bool> DeleteArtifactAsync(string id, CancellationToken ct);
    Task<IReadOnlyList<DesignVersionDto>> VersionsAsync(string artifactId, CancellationToken ct);
    Task<DesignArtifactDto?> RestoreVersionAsync(string artifactId, string versionId, CancellationToken ct);
    Task<DesignArtifactDto?> GenerateArtifactAsync(string artifactId, GenerateArtifactInput input, CancellationToken ct);

    DesignPreviewResult GeneratePreview(GeneratePreviewInput input);
    IReadOnlyList<object> Workflows();
}
