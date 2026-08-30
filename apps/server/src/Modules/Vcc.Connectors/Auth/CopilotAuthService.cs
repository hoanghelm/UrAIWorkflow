using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;
using Vcc.Connectors.Contracts;

namespace Vcc.Connectors.Auth;

public sealed class CopilotAuthService(HttpClient http, IConnectorDbContext db) : ICopilotAuthService
{
    private const string ClientId = "Iv1.b507a08c87ecfe98";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task<CopilotLoginDto> LoginAsync(CancellationToken ct)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, "https://github.com/login/device/code");
        req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        req.Content = JsonContent.Create(new { client_id = ClientId, scope = "read:user" });
        using var resp = await http.SendAsync(req, ct);
        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(Json, ct);
        return new CopilotLoginDto(
            body.GetProperty("device_code").GetString() ?? "",
            body.GetProperty("user_code").GetString() ?? "",
            body.GetProperty("verification_uri").GetString() ?? "https://github.com/login/device",
            body.TryGetProperty("interval", out var iv) ? iv.GetInt32() : 5,
            body.TryGetProperty("expires_in", out var ex) ? ex.GetInt32() : 900);
    }

    public async Task<CopilotPollDto> PollAsync(string deviceCode, CancellationToken ct)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, "https://github.com/login/oauth/access_token");
        req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        req.Content = JsonContent.Create(new { client_id = ClientId, device_code = deviceCode, grant_type = "urn:ietf:params:oauth:grant-type:device_code" });
        using var resp = await http.SendAsync(req, ct);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(Json, ct);

        if (body.TryGetProperty("access_token", out var token) && token.ValueKind == JsonValueKind.String)
        {
            var models = new Dictionary<string, string> { ["opus"] = "gpt-4o", ["sonnet"] = "gpt-4o", ["haiku"] = "gpt-4o-mini" };
            var connector = new Connector
            {
                Name = "GitHub Copilot",
                Provider = "copilot",
                ApiKey = token.GetString() ?? "",
                Models = JsonSerializer.Serialize(models, Json),
                Active = !await db.Connectors.AnyAsync(ct),
            };
            db.Connectors.Add(connector);
            await db.SaveChangesAsync(ct);
            return new CopilotPollDto("authorized", new ConnectorDto(connector.Id, connector.Name, connector.Provider, connector.BaseUrl, connector.Active, true));
        }

        return new CopilotPollDto("pending", null);
    }
}
