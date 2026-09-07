using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class Bundle : Entity
{
    public string Kind { get; set; } = "";
    public string Key { get; set; } = "";
    public string Name { get; set; } = "";
    public string Version { get; set; } = "1.0.0";
    public string Hash { get; set; } = "";
    public string Description { get; set; } = "";
    public string Author { get; set; } = "";
    public string Tags { get; set; } = "[]";
    public int Stars { get; set; }
    public string Source { get; set; } = "";
    public string Archive { get; set; } = "";
    public string Meta { get; set; } = "{}";
}
