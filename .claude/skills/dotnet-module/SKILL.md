---
name: dotnet-module
description: Add a new feature module to the .NET backend (apps/server). TRIGGER when creating a new backend capability as a Vcc.* project under apps/server/src/Modules. SKIP for edits to an existing module or for a new endpoint/entity (use dotnet-endpoint / ef-model).
---

A module is a class-library project `apps/server/src/Modules/Vcc.<Name>` with a `DependencyInjection.cs`
and one or more services behind interfaces. No CQRS — services hold the logic.

## Steps

1. Create the project:
   ```
   dotnet new classlib -o apps/server/src/Modules/Vcc.<Name> -n Vcc.<Name>
   dotnet sln apps/server/Vcc.sln add apps/server/src/Modules/Vcc.<Name>/Vcc.<Name>.csproj
   ```
   Delete the default `Class1.cs`.

2. Reference only what the dependency direction allows (Shared ← Domain ← Infrastructure ← this):
   ```
   dotnet add apps/server/src/Modules/Vcc.<Name> reference apps/server/src/Modules/Vcc.Shared
   # + Vcc.Domain / Vcc.Infrastructure if it needs entities / persistence
   ```
   Cross-module needs are satisfied by interfaces in `Vcc.Shared`, never by referencing another feature module.

3. Put the module's public contracts (service interfaces the Api or other modules call) in
   `Vcc.Shared/Application/Interfaces` if they cross a boundary; keep module-internal interfaces local.

4. Implement `Services/<Name>Service.cs` (sealed, behind `I<Name>Service`). Constructor-inject the
   DbContext interface (`I<Name>DbContext`) and any `Vcc.Shared` ports it needs.

5. Add `DependencyInjection.cs`:
   ```csharp
   namespace Vcc.<Name>;
   public static class DependencyInjection
   {
       public static IServiceCollection Add<Name>Module(this IServiceCollection services)
       {
           services.AddScoped<I<Name>Service, <Name>Service>();
           return services;
       }
   }
   ```

6. Register it in `Vcc.Api` composition root: `builder.Services.Add<Name>Module();`

7. If it persists data, add its entities + `I<Name>DbContext` via the `ef-model` skill. If it exposes
   HTTP, add endpoints via `dotnet-endpoint`.

8. `dotnet build apps/server/Vcc.sln` must be green.

## Rules
Read `.claude/rules/backend-dotnet.md` first. One public type per file, file-scoped namespace, sealed by
default, no code comments.
