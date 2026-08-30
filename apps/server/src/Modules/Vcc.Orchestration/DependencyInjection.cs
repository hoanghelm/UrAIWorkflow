using Microsoft.Extensions.DependencyInjection;
using Vcc.Orchestration.Context;
using Vcc.Orchestration.Engine;
using Vcc.Orchestration.Stages;
using Vcc.Orchestration.Runner;
using Vcc.Orchestration.State;
using Vcc.Orchestration.Events;
using Vcc.Orchestration.Context;
using Vcc.Orchestration.Triggers;
using Vcc.Orchestration.Background;

namespace Vcc.Orchestration;

public static class DependencyInjection
{
    public static IServiceCollection AddOrchestrationModule(this IServiceCollection services)
    {
        services.AddSingleton<IRunControl, RunControl>();
        services.AddSingleton<IPromptComposer, PromptComposer>();
        services.AddSingleton<IVerdictParser, VerdictParser>();
        services.AddScoped<IStageVerifier, StageVerifier>();
        services.AddScoped<IRunStateStore, RunStateStore>();
        services.AddScoped<IRunEventLog, RunEventLog>();
        services.AddScoped<IStageExecutor, StageExecutor>();
        services.AddScoped<IWorkflowEngine, WorkflowEngine>();
        services.AddScoped<IRunnerService, RunnerService>();
        services.AddScoped<IRunReadService, RunReadService>();
        services.AddScoped<IRunActionService, RunActionService>();
        services.AddScoped<ITriggerService, TriggerService>();
        services.AddHostedService<RunWatchdog>();
        return services;
    }
}
