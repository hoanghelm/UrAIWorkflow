using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class RunEvent : Entity
{
    public string RunId { get; set; } = "";
    public DateTime At { get; set; } = DateTime.UtcNow;
    public string Level { get; set; } = "info";
    public string? StageId { get; set; }
    public string? Status { get; set; }
    public string? StageStatus { get; set; }
    public string? Breach { get; set; }
    public string Message { get; set; } = "";
}
