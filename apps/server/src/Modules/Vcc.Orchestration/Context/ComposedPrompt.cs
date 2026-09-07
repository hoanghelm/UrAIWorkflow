namespace Vcc.Orchestration.Context;

public sealed record ComposedPrompt(IReadOnlyList<string> System, string User)
{
    public string Flatten() => string.Join("\n\n", System.Append(User)).Trim();
}
