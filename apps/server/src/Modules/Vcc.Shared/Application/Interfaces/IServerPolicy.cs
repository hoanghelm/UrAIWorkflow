namespace Vcc.Shared.Application.Interfaces;

public interface IServerPolicy
{
    IReadOnlyList<string> AllowedModels { get; }
    IReadOnlyList<string> AllowedProviders { get; }
    bool ConnectorsLocked { get; }
    string ResolveModel(string requestedTier);
}
