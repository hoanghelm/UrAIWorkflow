namespace Vcc.Domain.Entities;
public sealed class WorkspaceConnector
{
    public string ProjectId { get; set; } = "";
    public string ConnectorId { get; set; } = "";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
