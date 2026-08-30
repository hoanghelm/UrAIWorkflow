using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class Trigger : Entity
{
    public string Name { get; set; } = "";
    public string ProjectId { get; set; } = "";
    public string Pack { get; set; } = "";
    public string Type { get; set; } = "manual";
    public int IntervalSec { get; set; } = 3600;
    public bool Enabled { get; set; } = true;
    public DateTime? LastRunAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
