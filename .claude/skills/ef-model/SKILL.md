---
name: ef-model
description: Add or change a database table in the .NET backend. TRIGGER when a module needs new persistence in apps/server (a new entity, field, or relation). EF Core for CRUD; migrations are hand-written SM/DM classes in Vcc.Migrations (SQLite + Postgres), not dotnet ef.
---

Persistence has two halves:

- **EF Core** (`VccDbContext` in `Vcc.Infrastructure`) for entity CRUD — split `I*DbContext` interfaces,
  one implementation. Reads and writes go through it (or SqlKata for complex reads).
- **`Vcc.Migrations`** owns the schema and seed data as versioned C# classes, applied by runners at
  startup — **not** `dotnet ef migrations`. Schema DDL is raw SQL per provider (SQLite/Postgres differ);
  data is SqlKata (provider-agnostic).

## Steps

1. **Entity** in `Vcc.Domain` (`Entities/<Entity>.cs`): a `sealed class` extending `Entity` /
   `AggregateRoot`. Plain properties, no EF attributes.

2. **DbSet + interface**: add `DbSet<<Entity>>` to `VccDbContext`; expose it on the owning module's
   `I<Area>DbContext` (in `Vcc.Infrastructure/Persistence/Abstractions`). Register the interface in
   `AddInfrastructure` if new.

3. **Schema migration** — add the next `SM###_<Name>.cs` in **both** provider folders, implementing
   `ISchemaMigration` with the matching `DbProvider`:
   - `Vcc.Migrations/Schema/Sqlite/SM###_<Name>.cs` (`Provider => DbProvider.Sqlite`)
   - `Vcc.Migrations/Schema/Postgres/SM###_<Name>.cs` (`Provider => DbProvider.Postgres`)
   Use `ctx.Execute("CREATE TABLE IF NOT EXISTS \"Xxx\" (...)")`. **Quote every table/column name** so
   EF's delimited SQL matches (case-sensitive on Postgres). Types: `TEXT`/`INTEGER` both providers;
   timestamps `TEXT` on SQLite / `TIMESTAMPTZ` on Postgres; bool `INTEGER` on SQLite / `BOOLEAN` on Postgres.
   Column names are the EF property names; table name is the `DbSet` property name.

4. **Data migration** (only if seeding/backfilling) — add `DM###_<Name>.cs` in `Vcc.Migrations/Data/`
   implementing `IDataMigration`. Use `ctx.Db` (SqlKata `QueryFactory`) — one class serves both
   providers. Make it idempotent (check existence before insert).

5. **Register** the new migrations in `Vcc.Migrations/DependencyInjection.cs` (`AddSingleton<ISchemaMigration, ...>`
   for both providers; `AddSingleton<IDataMigration, ...>`). The runners order by `Version`, skip
   already-applied (tracked in `__vcc_schema_migrations` / `__vcc_data_migrations`), and run at startup
   via `MigrationOrchestrator` (schema then data).

6. `dotnet build apps/server/Vcc.sln` green; run the Api on SQLite and confirm the table exists and any
   seed applied.

## Rules
Read `.claude/rules/backend-dotnet.md`. Never inject one module's `I*DbContext` into another module's
service. Keep DDL quoted and provider-correct. Versions are sequential and never reused.
