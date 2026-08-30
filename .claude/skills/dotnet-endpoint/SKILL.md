---
name: dotnet-endpoint
description: Add a Minimal API endpoint group to the .NET backend (apps/server). TRIGGER when exposing a module's service over HTTP under Vcc.Api/Endpoints. SKIP for business logic (put that in the module service) or realtime (use Vcc.Notification / SignalR).
---

Endpoints are thin. They validate input, call a module service, and shape the response. No business
logic, no EF, no CQRS. One `<Feature>Endpoints.cs` per feature under `apps/server/src/Modules/Vcc.Api/Endpoints`.

## Steps

1. Create `Vcc.Api/Endpoints/<Feature>Endpoints.cs`:
   ```csharp
   namespace Vcc.Api.Endpoints;

   public static class <Feature>Endpoints
   {
       public static IEndpointRouteBuilder Map<Feature>(this IEndpointRouteBuilder app)
       {
           var group = app.MapGroup("/api/<feature>").WithTags("<Feature>");

           group.MapGet("/", async (I<Feature>Service svc, CancellationToken ct) =>
               Results.Ok(await svc.ListAsync(ct)));

           group.MapPost("/", async (Create<Feature>Request body, I<Feature>Service svc, CancellationToken ct) =>
           {
               var created = await svc.CreateAsync(body, ct);
               return Results.Created($"/api/<feature>/{created.Id}", created);
           });

           return app;
       }
   }
   ```

2. Requests/responses are C# `record` DTOs (in `Vcc.Api/Contracts` or the module) — never expose EF
   entities directly. These records are the OpenAPI contract the web consumes.

3. Register in the Api composition root: `app.Map<Feature>();`

4. Auth: in hosted mode every route except `/api/health` and `/api/whoami` requires the bearer token —
   applied by the global `HostedAuthGuard` filter/middleware, not per endpoint.

5. Validation: attach an endpoint filter running FluentValidation, or validate at the top of the service.

6. `dotnet build` green; hit the route via Swagger to confirm.

## Rules
Read `.claude/rules/backend-dotnet.md`. Endpoints depend only on the module's service interface and DTOs.
Keep them to routing + mapping; if an endpoint grows logic, move it into the service.
