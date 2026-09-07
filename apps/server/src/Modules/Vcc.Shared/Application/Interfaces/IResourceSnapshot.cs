namespace Vcc.Shared.Application.Interfaces;

public interface IResourceSnapshot
{
    Task<string> BuildAsync(string projectId, string packName, IReadOnlyList<string> skills, IReadOnlyList<string> agents, CancellationToken ct);
}
