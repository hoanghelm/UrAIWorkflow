using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class StageLog : Entity
{
    public string RunId { get; set; } = "";
    public string StageId { get; set; } = "";
    public string Text { get; set; } = "";
    public string Trace { get; set; } = "";
    public int Tokens { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
