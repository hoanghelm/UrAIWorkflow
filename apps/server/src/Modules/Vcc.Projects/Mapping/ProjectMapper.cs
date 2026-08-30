using System.Text.Json;
using Vcc.Domain.Entities;
using Vcc.Projects.Contracts;
using Vcc.Shared.Application.Common;

namespace Vcc.Projects.Mapping;

public sealed class ProjectMapper : IProjectMapper
{
    private static readonly JsonSerializerOptions Json = JsonDefaults.Web;

    public ProjectDto ToDto(Project p) => new(p.Id, p.Name, p.Root, p.Persona);

    public CatalogItemDto ToDto(CatalogItem c)
    {
        JsonElement meta;
        try { meta = JsonSerializer.Deserialize<JsonElement>(string.IsNullOrEmpty(c.Meta) ? "{}" : c.Meta, Json); }
        catch { meta = JsonSerializer.Deserialize<JsonElement>("{}", Json); }
        return new CatalogItemDto(c.Id, c.Kind, c.Name, null, null, c.Scope, false, c.Path, c.ProjectId, c.Trust, c.Version, c.Source, meta);
    }
}
