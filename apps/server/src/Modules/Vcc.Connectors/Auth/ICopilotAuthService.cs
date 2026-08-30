using Vcc.Connectors.Contracts;

namespace Vcc.Connectors.Auth;

public interface ICopilotAuthService
{
    Task<CopilotLoginDto> LoginAsync(CancellationToken ct);
    Task<CopilotPollDto> PollAsync(string deviceCode, CancellationToken ct);
}
