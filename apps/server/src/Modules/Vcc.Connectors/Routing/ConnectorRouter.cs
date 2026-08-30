using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Vcc.Connectors.Mapping;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Connectors.Routing;

public sealed class ConnectorRouter(
    IEnumerable<IAgentConnector> connectors,
    IConnectorDbContext connectorDb,
    IProjectDbContext projectDb,
    IConnectorMapper mapper,
    IConfiguration config) : IConnectorRouter
{
    private const string TerminalProvider = "terminal";
    private static readonly string[] LiveModes = ["live", "connector", "provider"];

    private IAgentConnector Terminal => connectors.FirstOrDefault(c => c.Provider == TerminalProvider) ?? connectors.First();

    public async Task<StageResult> RunStageAsync(StageRequest request, Func<string, Task> onDelta, CancellationToken ct)
    {
        var mode = (config["AGENT_EXECUTION"] ?? "local").ToLowerInvariant();
        if (!LiveModes.Contains(mode))
            return await Terminal.RunStageAsync(request, TerminalContext(), onDelta, ct);

        var active = await ResolveActiveAsync(request.ProjectId, ct);
        if (active is null || string.IsNullOrEmpty(active.ApiKey))
            return await Terminal.RunStageAsync(request, TerminalContext(), onDelta, ct);

        var connector = connectors.FirstOrDefault(c => c.Provider == active.Provider);
        if (connector is null)
            return await Terminal.RunStageAsync(request, TerminalContext(), onDelta, ct);

        var ctx = new ConnectorContext(active.Provider, active.ApiKey, active.BaseUrl, mapper.ParseModels(active.Models));
        return await connector.RunStageAsync(request, ctx, onDelta, ct);
    }

    private async Task<Connector?> ResolveActiveAsync(string projectId, CancellationToken ct)
    {
        var pinnedId = await projectDb.WorkspaceConnectors
            .Where(w => w.ProjectId == projectId).Select(w => w.ConnectorId).FirstOrDefaultAsync(ct);

        if (!string.IsNullOrEmpty(pinnedId))
        {
            var pinned = await connectorDb.Connectors.FirstOrDefaultAsync(c => c.Id == pinnedId, ct);
            if (pinned is not null) return pinned;
        }
        return await connectorDb.Connectors.FirstOrDefaultAsync(c => c.Active, ct);
    }

    private ConnectorContext TerminalContext() => new(Terminal.Provider, null, null, new Dictionary<string, string>());
}
