using System.Runtime.InteropServices;
using System.Text;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Connectors.Agents;

public sealed class TerminalAgentConnector(ITerminalSessionManager terminal) : IAgentConnector
{
    private const int PromptPreviewLength = 200;

    public string Provider => "terminal";

    public async Task<StageResult> RunStageAsync(StageRequest request, ConnectorContext context, Func<string, Task> onDelta, CancellationToken ct)
    {
        var spec = BuildSpec(request);
        var sessionId = await terminal.StartAsync(spec, ct);

        var output = new StringBuilder();
        await foreach (var line in terminal.StreamAsync(sessionId, ct))
        {
            output.AppendLine(line);
            await onDelta(line);
        }

        var text = output.ToString();
        return new StageResult(true, text, EstimateTokens(request.Prompt), EstimateTokens(text));
    }

    private static TerminalSpec BuildSpec(StageRequest request)
    {
        var prompt = request.Prompt.Replace("\"", "'").Replace("\n", " ");
        if (prompt.Length > PromptPreviewLength) prompt = prompt[..PromptPreviewLength];

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            var script = $"echo [{request.Model}] planning & echo working on: {prompt} & echo applied changes & echo done";
            return new TerminalSpec("cmd.exe", ["/c", script], request.Cwd, null);
        }

        var sh = $"echo '[{request.Model}] planning'; echo 'working on: {prompt}'; echo 'applied changes'; echo 'done'";
        return new TerminalSpec("/bin/sh", ["-c", sh], request.Cwd, null);
    }

    private static int EstimateTokens(string text) => text.Length == 0 ? 0 : Math.Max(1, text.Length / 4);
}
