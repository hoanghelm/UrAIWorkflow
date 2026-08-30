using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class DesignVersion : Entity
{
    public string ArtifactId { get; set; } = "";
    public int Build { get; set; }
    public string Content { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
