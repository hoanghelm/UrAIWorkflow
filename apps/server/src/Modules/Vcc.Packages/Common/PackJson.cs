using System.Text.Json;
using Vcc.Shared.Application.Common;

namespace Vcc.Packages.Common;

public static class PackJson
{
    public static readonly JsonSerializerOptions Options = JsonDefaults.Web;

    public const string DataDirectory = "data";

    public static string DataFile(string name) => Path.Combine(AppContext.BaseDirectory, DataDirectory, name);

    public static IReadOnlyList<string> StrArray(JsonElement el, string prop)
        => el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.Array
            ? v.EnumerateArray().Where(x => x.ValueKind == JsonValueKind.String).Select(x => x.GetString()!).ToList()
            : [];

    public static string Str(JsonElement el, string prop, string fallback = "")
        => el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString()! : fallback;

    public static IReadOnlyList<string> ParseStringList(string json)
    {
        try
        {
            var el = JsonSerializer.Deserialize<JsonElement>(string.IsNullOrEmpty(json) ? "[]" : json, Options);
            return el.ValueKind == JsonValueKind.Array
                ? el.EnumerateArray().Where(x => x.ValueKind == JsonValueKind.String).Select(x => x.GetString()!).ToList()
                : [];
        }
        catch { return []; }
    }
}
