using System.Text.Json;
using Vcc.Connectors.Contracts;
using Vcc.Domain.Entities;
using Vcc.Shared.Application.Common;

namespace Vcc.Connectors.Mapping;

public sealed class ConnectorMapper : IConnectorMapper
{
    private static readonly JsonSerializerOptions Json = JsonDefaults.Web;

    public ConnectorDto ToDto(Connector c) => new(c.Id, c.Name, c.Provider, c.BaseUrl, c.Active, !string.IsNullOrEmpty(c.ApiKey));

    public ModelMapDto ToModelMap(string modelsJson)
    {
        var map = ParseModels(modelsJson);
        return new ModelMapDto(map.GetValueOrDefault("opus", ""), map.GetValueOrDefault("sonnet", ""), map.GetValueOrDefault("haiku", ""));
    }

    public IReadOnlyDictionary<string, string> ParseModels(string modelsJson)
    {
        try { return JsonSerializer.Deserialize<Dictionary<string, string>>(modelsJson, Json) ?? new(); }
        catch { return new Dictionary<string, string>(); }
    }

    public string SerializeModels(IReadOnlyDictionary<string, string> models) => JsonSerializer.Serialize(models, Json);
}
