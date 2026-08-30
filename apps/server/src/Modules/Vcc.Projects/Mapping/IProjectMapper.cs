using Vcc.Domain.Entities;
using Vcc.Projects.Contracts;

namespace Vcc.Projects.Mapping;

public interface IProjectMapper
{
    ProjectDto ToDto(Project project);
    CatalogItemDto ToDto(CatalogItem item);
}
