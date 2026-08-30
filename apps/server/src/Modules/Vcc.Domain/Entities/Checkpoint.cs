using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class Checkpoint : Entity
{
    public string RunId { get; set; } = "";
    public string StageId { get; set; } = "";
    public string State { get; set; } = "{}";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
