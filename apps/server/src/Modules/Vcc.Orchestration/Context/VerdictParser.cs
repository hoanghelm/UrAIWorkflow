using System.Text.Json;
using Vcc.Shared.Application.Common;

namespace Vcc.Orchestration.Context;

public sealed record StageVerdict(bool Passed, IReadOnlyList<string> Issues);

public interface IVerdictParser
{
    StageVerdict? Parse(string output);
}

public sealed class VerdictParser : IVerdictParser
{
    public StageVerdict? Parse(string output)
    {
        if (string.IsNullOrEmpty(output)) return null;

        foreach (var candidate in ExtractJsonObjects(output))
        {
            try
            {
                var el = JsonSerializer.Deserialize<JsonElement>(candidate, JsonDefaults.Web);
                if (el.ValueKind != JsonValueKind.Object) continue;
                if (!el.TryGetProperty("passed", out var passed)) continue;
                if (passed.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) continue;

                var issues = el.TryGetProperty("issues", out var iss) && iss.ValueKind == JsonValueKind.Array
                    ? iss.EnumerateArray().Where(x => x.ValueKind == JsonValueKind.String).Select(x => x.GetString()!).ToList()
                    : [];
                return new StageVerdict(passed.GetBoolean(), issues);
            }
            catch { }
        }
        return null;
    }

    private static IEnumerable<string> ExtractJsonObjects(string text)
    {
        var results = new List<string>();
        var depth = 0;
        var start = -1;
        for (var i = 0; i < text.Length; i++)
        {
            if (text[i] == '{')
            {
                if (depth == 0) start = i;
                depth++;
            }
            else if (text[i] == '}' && depth > 0)
            {
                depth--;
                if (depth == 0 && start >= 0)
                {
                    results.Add(text.Substring(start, i - start + 1));
                    start = -1;
                }
            }
        }
        results.Reverse();
        return results;
    }
}
