using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class Stage : Entity
{
    public string RunId { get; set; } = "";
    public string StageId { get; set; } = "";
    public string Title { get; set; } = "";
    public string Agent { get; set; } = "";
    public string Model { get; set; } = "inherit";
    public string Status { get; set; } = "pending";
    public int Attempts { get; set; }
    public int Tokens { get; set; }
    public int Order { get; set; }
}
