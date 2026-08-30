using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class Sprint : Entity
{
    public string ProjectId { get; set; } = "";
    public string Name { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
