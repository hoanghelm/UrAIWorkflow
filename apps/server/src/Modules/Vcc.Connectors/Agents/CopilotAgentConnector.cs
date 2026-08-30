using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Connectors.Agents;

public sealed class CopilotAgentConnector(HttpClient http) : IAgentConnector
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public string Provider => "copilot";

    public async Task<StageResult> RunStageAsync(StageRequest request, ConnectorContext context, Func<string, Task> onDelta, CancellationToken ct)
    {
        var model = context.Models.TryGetValue(request.Model, out var m) ? m : "gpt-4o";
        if (string.IsNullOrEmpty(context.ApiKey))
            return new StageResult(false, "copilot connector has no token", 0, 0);

        try
        {
            var copilotToken = await ExchangeAsync(context.ApiKey, ct);
            if (copilotToken is null)
            {
                await onDelta("copilot token exchange failed");
                return new StageResult(false, "copilot token exchange failed", 0, 0);
            }

            using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.githubcopilot.com/chat/completions");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", copilotToken);
            req.Headers.TryAddWithoutValidation("Editor-Version", "vscode/1.90.0");
            req.Headers.TryAddWithoutValidation("Copilot-Integration-Id", "vscode-chat");
            req.Content = JsonContent.Create(new
            {
                model,
                messages = new[] { new { role = "user", content = request.Prompt } },
                stream = false,
            });

            using var resp = await http.SendAsync(req, ct);
            var body = await resp.Content.ReadFromJsonAsync<JsonElement>(Json, ct);
            if (!resp.IsSuccessStatusCode)
            {
                var err = $"copilot error {(int)resp.StatusCode}";
                await onDelta(err);
                return new StageResult(false, err, 0, 0);
            }

            var text = body.TryGetProperty("choices", out var choices) && choices.GetArrayLength() > 0
                ? choices[0].GetProperty("message").GetProperty("content").GetString() ?? ""
                : "";
            await onDelta(text);

            var (input, output) = Usage(body, request.Prompt, text);
            return new StageResult(true, text, input, output);
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex)
        {
            await onDelta($"copilot exception: {ex.Message}");
            return new StageResult(false, ex.Message, 0, 0);
        }
    }

    private async Task<string?> ExchangeAsync(string githubToken, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/copilot_internal/v2/token");
        req.Headers.Authorization = new AuthenticationHeaderValue("token", githubToken);
        req.Headers.UserAgent.ParseAdd("VccWorkflow/0.1");
        using var resp = await http.SendAsync(req, ct);
        if (!resp.IsSuccessStatusCode) return null;
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(Json, ct);
        return body.TryGetProperty("token", out var t) ? t.GetString() : null;
    }

    private static (int, int) Usage(JsonElement body, string prompt, string text)
    {
        if (body.TryGetProperty("usage", out var usage))
        {
            var input = usage.TryGetProperty("prompt_tokens", out var pt) ? pt.GetInt32() : prompt.Length / 4;
            var output = usage.TryGetProperty("completion_tokens", out var ctk) ? ctk.GetInt32() : text.Length / 4;
            return (input, output);
        }
        return (Math.Max(1, prompt.Length / 4), Math.Max(1, text.Length / 4));
    }
}
