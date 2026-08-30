namespace Vcc.Packages.Contracts;

public sealed record InstallPackInput(string ProjectId);

public sealed record InstallComponentsInput(string ProjectId, string[] Ids);
