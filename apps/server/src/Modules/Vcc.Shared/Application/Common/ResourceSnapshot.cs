namespace Vcc.Shared.Application.Common;

public sealed record ResourcePin(string Version, string Hash, string Path);

public sealed record PackPin(string Name, string Version);

public sealed record ResourceSnapshot(
    PackPin? Pack,
    IReadOnlyDictionary<string, ResourcePin> Skills,
    IReadOnlyDictionary<string, ResourcePin> Agents);
