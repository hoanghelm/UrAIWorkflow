using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class DesignArtifact : Entity
{
    public string DesignId { get; set; } = "";
    public string Kind { get; set; } = "mockup";
    public string Title { get; set; } = "";
    public string Format { get; set; } = "html";
    public string Content { get; set; } = "";
    public int Version { get; set; } = 1;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
