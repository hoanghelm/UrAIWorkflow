using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Vcc.Connectors.Agents;
using Vcc.Connectors.Auth;
using Vcc.Connectors.Configuration;
using Vcc.Connectors.Mapping;
using Vcc.Connectors.Policy;
using Vcc.Connectors.Routing;
using Vcc.Connectors.Services;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Connectors;

public static class DependencyInjection
{
    public static IServiceCollection AddConnectorsModule(this IServiceCollection services, IConfiguration config)
    {
        services.Configure<ConnectorOptions>(config.GetSection(ConnectorOptions.SectionName));

        var providerTimeout = TimeSpan.FromSeconds(config.GetValue("Connectors:ProviderTimeoutSeconds", 120));
        var authTimeout = TimeSpan.FromSeconds(config.GetValue("Connectors:AuthTimeoutSeconds", 30));

        services.AddSingleton<IServerPolicy, ServerPolicy>();
        services.AddSingleton<IConnectorMapper, ConnectorMapper>();

        services.AddScoped<TerminalAgentConnector>();
        services.AddHttpClient<ClaudeAgentConnector>(c => c.Timeout = providerTimeout);
        services.AddHttpClient<CopilotAgentConnector>(c => c.Timeout = providerTimeout);
        services.AddScoped<IAgentConnector>(sp => sp.GetRequiredService<TerminalAgentConnector>());
        services.AddScoped<IAgentConnector>(sp => sp.GetRequiredService<ClaudeAgentConnector>());
        services.AddScoped<IAgentConnector>(sp => sp.GetRequiredService<CopilotAgentConnector>());

        services.AddScoped<IConnectorRouter, ConnectorRouter>();
        services.AddScoped<IConnectorService, ConnectorService>();
        services.AddHttpClient<ICopilotAuthService, CopilotAuthService>(c => c.Timeout = authTimeout);
        return services;
    }
}
