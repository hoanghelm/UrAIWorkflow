using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Vcc.Connectors.Configuration;
using Vcc.Connectors.Contracts;
using Vcc.Connectors.Mapping;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;

namespace Vcc.Connectors.Services;

public sealed class ConnectorService(
    IConnectorDbContext db,
    IProjectDbContext projects,
    IMetricsDbContext metrics,
    IRunDbContext runs,
    IConnectorMapper mapper,
    IOptions<ConnectorOptions> options) : IConnectorService
{
    private readonly ConnectorOptions _options = options.Value;

    public async Task<IReadOnlyList<ConnectorDto>> ListAsync(CancellationToken ct)
        => (await db.Connectors.OrderByDescending(c => c.CreatedAt).ToListAsync(ct)).Select(mapper.ToDto).ToList();

    public async Task<ConnectorDto> CreateAsync(CreateConnectorInput input, CancellationToken ct)
    {
        var provider = input.Provider ?? _options.DefaultProvider;
        var models = _options.ModelsFor(provider);
        if (input.Models is not null)
            foreach (var kv in input.Models) models[kv.Key] = kv.Value;

        var connector = new Connector
        {
            Name = input.Name,
            Provider = provider,
            ApiKey = input.ApiKey ?? "",
            BaseUrl = input.BaseUrl,
            Models = mapper.SerializeModels(models),
            Active = !await db.Connectors.AnyAsync(ct),
        };
        db.Connectors.Add(connector);
        await db.SaveChangesAsync(ct);
        return mapper.ToDto(connector);
    }

    public async Task<ConnectorDto?> ActivateAsync(string id, CancellationToken ct)
    {
        var target = await db.Connectors.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (target is null) return null;
        foreach (var c in await db.Connectors.ToListAsync(ct)) c.Active = c.Id == id;
        await db.SaveChangesAsync(ct);
        return mapper.ToDto(target);
    }

    public async Task<IReadOnlyList<ConnectorDto>> DeactivateAllAsync(CancellationToken ct)
    {
        var all = await db.Connectors.ToListAsync(ct);
        foreach (var c in all) c.Active = false;
        await db.SaveChangesAsync(ct);
        return all.Select(mapper.ToDto).ToList();
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken ct)
    {
        var connector = await db.Connectors.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (connector is null) return false;
        db.Connectors.Remove(connector);
        var links = await projects.WorkspaceConnectors.Where(w => w.ConnectorId == id).ToListAsync(ct);
        projects.WorkspaceConnectors.RemoveRange(links);
        await db.SaveChangesAsync(ct);
        await projects.SaveChangesAsync(ct);
        return true;
    }

    public async Task<(bool ok, string? error)> TestAsync(string id, CancellationToken ct)
    {
        var connector = await db.Connectors.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (connector is null) return (false, "connector not found");
        if (connector.Provider == "claude" && string.IsNullOrEmpty(connector.ApiKey))
            return (false, "missing api key");
        return (true, null);
    }

    public async Task<ConnectorUsageDto> UsageAsync(CancellationToken ct)
    {
        var active = await db.Connectors.FirstOrDefaultAsync(c => c.Active, ct);
        var account = active is null ? null : new ConnectorAccount(active.Id, active.Name, active.Provider);
        var models = active is null ? null : mapper.ToModelMap(active.Models);

        var runList = await runs.Runs.ToListAsync(ct);
        var totalConsumed = runList.Sum(r => r.TokensConsumed);
        var totalSaved = runList.Sum(r => r.TokensSaved);

        var stages = await runs.Stages.ToListAsync(ct);
        var byModel = stages.Where(s => s.Tokens > 0).GroupBy(s => s.Model)
            .Select(g => new ModelUsageDto(g.Key, g.Sum(s => s.Tokens))).ToList();

        var ledger = await metrics.LedgerEntries.ToListAsync(ct);
        var byLever = ledger.GroupBy(l => l.Lever).ToDictionary(g => g.Key, g => g.Sum(l => l.TokensAfter));

        return new ConnectorUsageDto(account, models, byModel, totalConsumed, totalSaved, byLever);
    }

    public async Task<string?> GetActiveForProjectAsync(string projectId, CancellationToken ct)
        => await projects.WorkspaceConnectors.Where(w => w.ProjectId == projectId).Select(w => w.ConnectorId).FirstOrDefaultAsync(ct);

    public async Task<string> SetActiveForProjectAsync(string projectId, string connectorId, CancellationToken ct)
    {
        var existing = await projects.WorkspaceConnectors.FirstOrDefaultAsync(w => w.ProjectId == projectId, ct);
        if (existing is null)
            projects.WorkspaceConnectors.Add(new WorkspaceConnector { ProjectId = projectId, ConnectorId = connectorId });
        else { existing.ConnectorId = connectorId; existing.UpdatedAt = DateTime.UtcNow; }
        await projects.SaveChangesAsync(ct);
        return connectorId;
    }

    public async Task ClearActiveForProjectAsync(string projectId, CancellationToken ct)
    {
        var existing = await projects.WorkspaceConnectors.FirstOrDefaultAsync(w => w.ProjectId == projectId, ct);
        if (existing is not null) { projects.WorkspaceConnectors.Remove(existing); await projects.SaveChangesAsync(ct); }
    }
}
