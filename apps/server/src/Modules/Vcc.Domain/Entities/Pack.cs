using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class Pack : Entity
{
    public string Name { get; set; } = "";
    public string Version { get; set; } = "";
    public string Description { get; set; } = "";
    public string Trust { get; set; } = "community";
    public string Manifest { get; set; } = "";
    public bool Installed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
