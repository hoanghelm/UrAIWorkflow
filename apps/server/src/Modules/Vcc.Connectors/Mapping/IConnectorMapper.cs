using Vcc.Connectors.Contracts;
using Vcc.Domain.Entities;

namespace Vcc.Connectors.Mapping;

public interface IConnectorMapper
{
    ConnectorDto ToDto(Connector connector);
    ModelMapDto ToModelMap(string modelsJson);
    IReadOnlyDictionary<string, string> ParseModels(string modelsJson);
    string SerializeModels(IReadOnlyDictionary<string, string> models);
}
