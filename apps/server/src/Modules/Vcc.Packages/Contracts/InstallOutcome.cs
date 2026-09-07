namespace Vcc.Packages.Contracts;

public sealed record InstallFailure(string Id, string Reason);

public sealed record InstallOutcome(IReadOnlyList<string> Installed, IReadOnlyList<InstallFailure> Failed);
