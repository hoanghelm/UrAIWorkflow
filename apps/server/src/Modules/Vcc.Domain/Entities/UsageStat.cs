using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class UsageStat : Entity
{
    public string? ProjectId { get; set; }
    public string BlockKind { get; set; } = "";
    public string BlockName { get; set; } = "";
    public int Invocations { get; set; }
    public DateTime LastUsedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
