using Microsoft.Extensions.DependencyInjection;
using Vcc.Shared.Application.Interfaces;
using Vcc.Terminal.Execution;
using Vcc.Terminal.Sessions;
using Vcc.Terminal.Git;
using Vcc.Terminal.Worktrees;

namespace Vcc.Terminal;

public static class DependencyInjection
{
    public static IServiceCollection AddTerminalModule(this IServiceCollection services)
    {
        services.AddSingleton<TerminalSessionManager>();
        services.AddSingleton<ITerminalSessionManager>(sp => sp.GetRequiredService<TerminalSessionManager>());
        services.AddSingleton<ICommandRunner, CommandRunner>();
        services.AddSingleton<IGitService, GitService>();
        services.AddSingleton<IWorktreeService, WorktreeService>();
        services.AddHostedService<TerminalReaper>();
        return services;
    }
}
