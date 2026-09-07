using System.Net;
using System.Text;
using Vcc.Connectors.Agents;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Modules.Tests;

public sealed class ClaudeAgentConnectorTests
{
    private sealed class CaptureHandler(string responseJson) : HttpMessageHandler
    {
        public string Body { get; private set; } = "";
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Body = request.Content is null ? "" : await request.Content.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseJson, Encoding.UTF8, "application/json"),
            };
        }
    }

    [Fact]
    public async Task SendsCacheableSystemBlocks_AndReadsCacheTokens()
    {
        const string resp = "{\"content\":[{\"type\":\"text\",\"text\":\"ok\"}],\"usage\":{\"input_tokens\":10,\"output_tokens\":5,\"cache_read_input_tokens\":42}}";
        var handler = new CaptureHandler(resp);
        var connector = new ClaudeAgentConnector(new HttpClient(handler));

        var request = new StageRequest("r", "s", "p", "sonnet", ["stable requirement prefix", "## Skill: x"], "the volatile question", "cwd");
        var context = new ConnectorContext("claude", "test-key", null, new Dictionary<string, string>());

        var result = await connector.RunStageAsync(request, context, _ => Task.CompletedTask, CancellationToken.None);

        Assert.True(result.Passed);
        Assert.Equal(42, result.CachedTokens);       // cache read parsed
        Assert.Equal(10, result.InputTokens);
        Assert.Contains("cache_control", handler.Body);   // cache breakpoints actually sent
        Assert.Contains("ephemeral", handler.Body);
        Assert.Contains("\"system\"", handler.Body);
        Assert.Contains("stable requirement prefix", handler.Body);
    }

    [Fact]
    public async Task NoApiKey_FailsGracefully()
    {
        var connector = new ClaudeAgentConnector(new HttpClient(new CaptureHandler("{}")));
        var request = new StageRequest("r", "s", "p", "sonnet", ["x"], "q", "cwd");
        var context = new ConnectorContext("claude", null, null, new Dictionary<string, string>());

        var result = await connector.RunStageAsync(request, context, _ => Task.CompletedTask, CancellationToken.None);

        Assert.False(result.Passed);
    }
}
