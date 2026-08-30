using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Connectors.Agents;

public sealed class ClaudeAgentConnector(HttpClient http) : IAgentConnector
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public string Provider => "claude";

    public async Task<StageResult> RunStageAsync(StageRequest request, ConnectorContext context, Func<string, Task> onDelta, CancellationToken ct)
    {
        var model = context.Models.TryGetValue(request.Model, out var m) ? m : "claude-sonnet-5";
        if (string.IsNullOrEmpty(context.ApiKey))
            return new StageResult(false, "claude connector has no api key", 0, 0);

        var baseUrl = string.IsNullOrEmpty(context.BaseUrl) ? "https://api.anthropic.com" : context.BaseUrl!.TrimEnd('/');
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/v1/messages");
            req.Headers.TryAddWithoutValidation("x-api-key", context.ApiKey);
            req.Headers.TryAddWithoutValidation("anthropic-version", "2023-06-01");
            req.Content = JsonContent.Create(new
            {
                model,
                max_tokens = 4096,
                messages = new[] { new { role = "user", content = request.Prompt } },
            });

            using var resp = await http.SendAsync(req, ct);
            var body = await resp.Content.ReadFromJsonAsync<JsonElement>(Json, ct);
            if (!resp.IsSuccessStatusCode)
            {
                var err = $"claude error {(int)resp.StatusCode}";
                await onDelta(err);
                return new StageResult(false, err, 0, 0);
            }

            var text = body.TryGetProperty("content", out var content) && content.GetArrayLength() > 0
                ? content[0].GetProperty("text").GetString() ?? ""
                : "";
            await onDelta(text);

            var input = body.TryGetProperty("usage", out var u) && u.TryGetProperty("input_tokens", out var it) ? it.GetInt32() : request.Prompt.Length / 4;
            var output = body.TryGetProperty("usage", out var u2) && u2.TryGetProperty("output_tokens", out var ot) ? ot.GetInt32() : text.Length / 4;
            return new StageResult(true, text, input, output);
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex)
        {
            await onDelta($"claude exception: {ex.Message}");
            return new StageResult(false, ex.Message, 0, 0);
        }
    }
}
