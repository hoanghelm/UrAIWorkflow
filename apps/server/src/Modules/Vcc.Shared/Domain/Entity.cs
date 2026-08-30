namespace Vcc.Shared.Domain;

public abstract class Entity
{
    public string Id { get; set; } = Guid.NewGuid().ToString("n");
}
