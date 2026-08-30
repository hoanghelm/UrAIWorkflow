using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class BoardComment : Entity
{
    public string CardId { get; set; } = "";
    public string Author { get; set; } = "human";
    public string Kind { get; set; } = "comment";
    public string Body { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
