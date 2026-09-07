using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class MemoryEntry : Entity
{
    public string ProjectId { get; set; } = "";
    public string Scope { get; set; } = "project";
    public string Key { get; set; } = "";
    public string Content { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
