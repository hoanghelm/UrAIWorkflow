namespace Vcc.Connectors.Contracts;

public sealed record ModelMapDto(string Opus, string Sonnet, string Haiku);

public sealed record ConnectorDto(string Id, string Name, string Provider, string? BaseUrl, bool Active, bool HasKey);

public sealed record ModelUsageDto(string Model, int Tokens);

public sealed record ConnectorAccount(string Id, string Name, string Provider);

public sealed record ConnectorUsageDto(
    ConnectorAccount? Account, ModelMapDto? Models, IReadOnlyList<ModelUsageDto> ByModel,
    int TotalConsumed, int TotalSaved, IReadOnlyDictionary<string, int> ByLever);

public sealed record CopilotLoginDto(string DeviceCode, string UserCode, string VerificationUri, int Interval, int ExpiresIn);

public sealed record CopilotPollDto(string Status, ConnectorDto? Connector);
