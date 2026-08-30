var builder = DistributedApplication.CreateBuilder(args);

builder.AddProject<Projects.Vcc_Api>("api");

builder.Build().Run();
