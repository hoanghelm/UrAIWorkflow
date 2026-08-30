using Microsoft.Extensions.Options;
using Vcc.Connectors.Configuration;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Connectors.Policy;

public sealed class ServerPolicy(IOptions<ConnectorOptions> options) : IServerPolicy
{
    private readonly ConnectorOptions _options = options.Value;

    public IReadOnlyList<string> AllowedModels => _options.AllowedModels;
    public IReadOnlyList<string> AllowedProviders => _options.AllowedProviders;
    public bool ConnectorsLocked => _options.ConnectorsLocked;

    public string ResolveModel(string requestedTier)
        => _options.AllowedModels.Contains(requestedTier) ? requestedTier : _options.AllowedModels[0];
}
