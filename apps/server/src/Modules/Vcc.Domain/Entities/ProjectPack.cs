using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class ProjectPack : Entity
{
    public string ProjectId { get; set; } = "";
    public string PackName { get; set; } = "";
    public string InstalledVersion { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
