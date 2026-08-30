namespace Vcc.Design.Contracts;

public sealed record CreateDesignInput(string ProjectId, string Name, string? Description);

public sealed record UpdateDesignInput(string? Name, string? Description);

public sealed record CreateDesignArtifactInput(string DesignId, string? Kind, string Title, string? Content);

public sealed record UpdateDesignArtifactInput(string? Title, string? Content);

public sealed record RestoreVersionInput(string VersionId);

public sealed record GenerateArtifactInput(string Requirement, string? Persona, string? Model, string? StreamId);

public sealed record GeneratePreviewInput(string? Kind, string Requirement, string? Context, string? Model, string? StreamId);
