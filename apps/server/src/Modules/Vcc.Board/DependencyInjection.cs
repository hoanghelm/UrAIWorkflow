using Microsoft.Extensions.DependencyInjection;
using Vcc.Board.Mapping;
using Vcc.Board.Preview;
using Vcc.Board.Services;

namespace Vcc.Board;

public static class DependencyInjection
{
    public static IServiceCollection AddBoardModule(this IServiceCollection services)
    {
        services.AddSingleton<IBoardMapper, BoardMapper>();
        services.AddSingleton<IPreviewStateStore, PreviewStateStore>();
        services.AddScoped<IBoardService, BoardService>();
        return services;
    }
}
