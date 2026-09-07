using Vcc.Api.Endpoints;
using Vcc.Board;
using Vcc.Connectors;
using Vcc.Design;
using Vcc.Infrastructure;
using Vcc.Metrics;
using Vcc.Notification;
using Vcc.Notification.Hubs;
using Vcc.Orchestration;
using Vcc.Packages;
using Vcc.Projects;
using Vcc.Features;
using Vcc.Terminal;
using Vcc.Test;
using Vcc.Migrations;
using Vcc.Migrations.Runners;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseWindowsService();

builder.AddServiceDefaults();

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddMigrations();
builder.Services.AddConnectorsModule(builder.Configuration);
builder.Services.AddTerminalModule();
builder.Services.AddMetricsModule();
builder.Services.AddNotificationModule();
builder.Services.AddPackagesModule();
builder.Services.AddOrchestrationModule();
builder.Services.AddProjectsModule();
builder.Services.AddFeaturesModule();
builder.Services.AddBoardModule();
builder.Services.AddDesignModule();
builder.Services.AddTestModule();

builder.Services.AddSignalR();

var webOrigin = builder.Configuration["WEB_ORIGIN"] ?? "*";
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
{
    if (webOrigin == "*")
        policy.SetIsOriginAllowed(_ => true).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
    else
        policy.WithOrigins(webOrigin.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
              .AllowAnyHeader().AllowAnyMethod().AllowCredentials();
}));

var app = builder.Build();
app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapDefaultEndpoints();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));
app.MapWhoami();
app.MapProjects();
app.MapBoard();
app.MapRuns();
app.MapConnectors();
app.MapDesigns();
app.MapTriggers();
app.MapMetrics();
app.MapPacks();
app.MapAi();
app.MapMarketplace();
app.MapMemory();
app.MapFeatures();
app.MapHub<RunsHub>("/runs");
app.MapFallbackToFile("{*path:regex(^(?!api/).*$)}", "index.html");

await app.Services.GetRequiredService<MigrationOrchestrator>().RunAsync();

using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<Vcc.Packages.Services.IPackService>().SeedAsync(CancellationToken.None);
    var marketplace = scope.ServiceProvider.GetRequiredService<Vcc.Packages.Services.IMarketplaceService>();
    await marketplace.SeedAsync(CancellationToken.None);
    var globalRoot = scope.ServiceProvider.GetRequiredService<Vcc.Orchestration.Context.IWorkspaceResolver>().GlobalRoot;
    await marketplace.MaterializeGlobalAsync(globalRoot, CancellationToken.None);
}

app.Run();
