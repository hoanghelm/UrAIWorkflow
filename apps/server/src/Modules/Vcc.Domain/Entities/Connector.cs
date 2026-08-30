using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class Connector : Entity
{
    public string Name { get; set; } = "";
    public string Provider { get; set; } = "";
    public string ApiKey { get; set; } = "";
    public string? BaseUrl { get; set; }
    public string Models { get; set; } = "{}";
    public bool Active { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
