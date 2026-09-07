using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class OutboxMessage : Entity
{
    public string RunId { get; set; } = "";
    public string Kind { get; set; } = "run.execute";
    public int Attempts { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public DateTime NotBefore { get; set; } = DateTime.UtcNow;
    public string? Error { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
