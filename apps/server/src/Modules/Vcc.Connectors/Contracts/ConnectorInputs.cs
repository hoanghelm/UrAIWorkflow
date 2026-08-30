namespace Vcc.Connectors.Contracts;

public sealed record CreateConnectorInput(string Name, string? Provider, string? ApiKey, string? BaseUrl, Dictionary<string, string>? Models);

public sealed record SetActiveConnectorInput(string ProjectId, string ConnectorId);
