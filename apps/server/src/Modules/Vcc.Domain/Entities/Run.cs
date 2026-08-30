using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class Run : Entity
{
    public string? ProjectId { get; set; }
    public string? CardId { get; set; }
    public string? Cwd { get; set; }
    public string Kind { get; set; } = "pipeline";
    public string Name { get; set; } = "";
    public string Pack { get; set; } = "";
    public string Status { get; set; } = "pending";
    public string? Breach { get; set; }
    public string? Question { get; set; }
    public string Workflow { get; set; } = "{}";
    public int TokensConsumed { get; set; }
    public int TokensSaved { get; set; }
    public int TokensInput { get; set; }
    public int TokensOutput { get; set; }
    public int TokensCached { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
