using Microsoft.EntityFrameworkCore;
using Vcc.Domain.Entities;
using Vcc.Features.Capabilities;
using Vcc.Features.Catalog;
using Vcc.Infrastructure.Persistence.Abstractions;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Features.Services;

public sealed class FeatureFlagService(IFeatureDbContext db, ICapabilityInspector inspector) : IFeatureFlags
{
    public async Task<IReadOnlyList<FeatureState>> ListAsync(CancellationToken ct)
    {
        var caps = await inspector.InspectAsync(ct);
        var overrides = await OverridesAsync(ct);
        return FeatureCatalog.All.Select(def => Build(def, overrides, caps)).ToList();
    }

    public async Task<FeatureState?> GetAsync(string key, CancellationToken ct)
    {
        var def = FeatureCatalog.Find(key);
        if (def is null) return null;
        var caps = await inspector.InspectAsync(ct);
        var overrides = await OverridesAsync(ct);
        return Build(def, overrides, caps);
    }

    public async Task<bool> IsAvailableAsync(string key, CancellationToken ct)
        => (await GetAsync(key, ct))?.Available ?? false;

    public async Task<FeatureState?> SetEnabledAsync(string key, bool enabled, CancellationToken ct)
    {
        var def = FeatureCatalog.Find(key);
        if (def is null) return null;

        var row = await db.FeatureFlags.FirstOrDefaultAsync(f => f.Key == key, ct);
        if (row is null) { row = new FeatureFlag { Key = key, Enabled = enabled }; db.FeatureFlags.Add(row); }
        else { row.Enabled = enabled; row.UpdatedAt = DateTime.UtcNow; }
        await db.SaveChangesAsync(ct);

        return await GetAsync(key, ct);
    }

    public async Task<IReadOnlyList<CapabilityState>> CapabilitiesAsync(CancellationToken ct)
        => (await inspector.InspectAsync(ct)).Values.OrderBy(c => c.Id).ToList();

    private async Task<IReadOnlyDictionary<string, bool>> OverridesAsync(CancellationToken ct)
        => await db.FeatureFlags.ToDictionaryAsync(f => f.Key, f => f.Enabled, ct);

    private static FeatureState Build(FeatureDefinition def, IReadOnlyDictionary<string, bool> overrides, IReadOnlyDictionary<string, CapabilityState> caps)
    {
        var enabled = overrides.TryGetValue(def.Key, out var configured) ? configured : def.DefaultEnabled;
        var missing = def.Requires.Where(r => !(caps.TryGetValue(r, out var c) && c.Present)).ToList();
        var available = enabled && missing.Count == 0;
        return new FeatureState(def.Key, def.Title, def.Description, enabled, available, def.Requires, missing);
    }
}
