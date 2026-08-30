using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class Artifact : Entity
{
    public string? RunId { get; set; }
    public string? ProjectId { get; set; }
    public string? CardId { get; set; }
    public int Build { get; set; } = 1;
    public string Name { get; set; } = "";
    public string Path { get; set; } = "";
    public string Files { get; set; } = "[]";
    public int SizeBytes { get; set; }
    public int FileCount { get; set; }
    public string Preview { get; set; } = "{}";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
