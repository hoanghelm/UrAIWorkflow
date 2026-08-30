using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class Design : Entity
{
    public string ProjectId { get; set; } = "";
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
