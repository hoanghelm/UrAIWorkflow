using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class Project : Entity
{
    public string Name { get; set; } = "";
    public string Root { get; set; } = "";
    public string Persona { get; set; } = "generalist";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
