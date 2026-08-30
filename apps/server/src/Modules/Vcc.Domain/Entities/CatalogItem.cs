using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class CatalogItem : Entity
{
    public string Kind { get; set; } = "";
    public string Name { get; set; } = "";
    public string Scope { get; set; } = "";
    public string? Path { get; set; }
    public string Trust { get; set; } = "community";
    public string Version { get; set; } = "0.0.0";
    public string Source { get; set; } = "discovered";
    public string Meta { get; set; } = "{}";
    public string? ProjectId { get; set; }
}
