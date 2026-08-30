using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class LedgerEntry : Entity
{
    public string RunId { get; set; } = "";
    public string StageId { get; set; } = "";
    public string Lever { get; set; } = "";
    public int TokensBefore { get; set; }
    public int TokensAfter { get; set; }
    public int Saved { get; set; }
}
