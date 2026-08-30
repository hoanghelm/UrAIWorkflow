using Vcc.Design.Contracts;
using Vcc.Domain.Entities;

namespace Vcc.Design.Mapping;

public interface IDesignMapper
{
    DesignDto ToDto(Vcc.Domain.Entities.Design design, int artifactCount);
    DesignArtifactDto ToDto(DesignArtifact artifact);
    DesignVersionDto ToDto(DesignVersion version);
}
