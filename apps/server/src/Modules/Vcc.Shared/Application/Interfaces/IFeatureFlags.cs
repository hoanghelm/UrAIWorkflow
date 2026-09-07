namespace Vcc.Shared.Application.Interfaces;

public sealed record CapabilityState(string Id, string Title, bool Present, string? Detail);

public sealed record FeatureState(
    string Key,
    string Title,
    string Description,
    bool Enabled,
    bool Available,
    IReadOnlyList<string> Requires,
    IReadOnlyList<string> Missing);

public interface IFeatureFlags
{
    Task<IReadOnlyList<FeatureState>> ListAsync(CancellationToken ct);
    Task<FeatureState?> GetAsync(string key, CancellationToken ct);
    Task<bool> IsAvailableAsync(string key, CancellationToken ct);
    Task<FeatureState?> SetEnabledAsync(string key, bool enabled, CancellationToken ct);
    Task<IReadOnlyList<CapabilityState>> CapabilitiesAsync(CancellationToken ct);
}
