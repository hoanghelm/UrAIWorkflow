namespace Vcc.Projects.Contracts;

public sealed record RegisterProjectInput(string Name, string Root, string? Persona);

public sealed record CloneProjectInput(string Name, string GitUrl, string? Persona);

public sealed record PersonaInput(string Persona);

public sealed record ExplainInput(string? StreamId, string Question, string? Focus, string[]? Files, string[]? Outline);
