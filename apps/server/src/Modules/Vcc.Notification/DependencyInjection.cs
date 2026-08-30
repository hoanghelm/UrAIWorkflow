using Microsoft.Extensions.DependencyInjection;
using Vcc.Notification.Notifications;
using Vcc.Notification.State;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Notification;

public static class DependencyInjection
{
    public static IServiceCollection AddNotificationModule(this IServiceCollection services)
    {
        services.AddSingleton<ILiveStateStore, LiveStateStore>();
        services.AddScoped<IRunNotifier, RunNotifier>();
        return services;
    }
}
