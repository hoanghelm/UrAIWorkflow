using Vcc.Design.Contracts;
using Vcc.Domain.Entities;

namespace Vcc.Design.Mapping;

public sealed class DesignMapper : IDesignMapper
{
    public DesignDto ToDto(Vcc.Domain.Entities.Design d, int artifactCount)
        => new(d.Id, d.ProjectId, d.Name, d.Description, d.CreatedAt.ToString("O"), artifactCount);

    public DesignArtifactDto ToDto(DesignArtifact a)
        => new(a.Id, a.DesignId, a.Kind, a.Title, a.Format, a.Content, a.Version, a.CreatedAt.ToString("O"), a.UpdatedAt.ToString("O"));

    public DesignVersionDto ToDto(DesignVersion v)
        => new(v.Id, v.ArtifactId, v.Build, v.Content, v.CreatedAt.ToString("O"));
}
