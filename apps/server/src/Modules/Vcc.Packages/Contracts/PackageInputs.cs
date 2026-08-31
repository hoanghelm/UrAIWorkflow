namespace Vcc.Packages.Contracts;

public sealed record InstallPackInput(string ProjectId);

public sealed record InstallComponentsInput(string ProjectId, string[] Ids);

public sealed record ImportBundleInput(string Source, string? Kind, string? Name);
