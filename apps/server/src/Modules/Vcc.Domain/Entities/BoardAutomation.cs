using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class BoardAutomation : Entity
{
    public string ProjectId { get; set; } = "";
    public string Trigger { get; set; } = "";
    public string Action { get; set; } = "";
    public bool Enabled { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
