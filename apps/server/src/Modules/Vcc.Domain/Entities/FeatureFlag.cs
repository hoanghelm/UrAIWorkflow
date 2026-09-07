using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class FeatureFlag : Entity
{
    public string Key { get; set; } = "";
    public bool Enabled { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
