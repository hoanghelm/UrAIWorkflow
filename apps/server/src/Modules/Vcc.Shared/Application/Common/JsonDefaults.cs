using System.Text.Json;

namespace Vcc.Shared.Application.Common;

public static class JsonDefaults
{
    public static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);
}
