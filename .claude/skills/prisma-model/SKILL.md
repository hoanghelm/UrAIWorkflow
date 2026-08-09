---
name: prisma-model
description: Add or change a database table via Prisma. TRIGGER when a backend feature needs new persistence in apps/api (a new model, field, or relation). Local SQLite only.
---

Persistence lives in `apps/api/prisma/schema.prisma`, SQLite.

## Steps
1. Add or edit the `model` in `schema.prisma`. Give every model an `id`, sensible `@@index` on foreign keys and status fields, and `@default(now())` timestamps where useful.
2. Store JSON-shaped data as a `String` column and serialize with `JSON.stringify` / `JSON.parse` in the service (SQLite has no JSON column). Follow how `Run.workflow` and `CatalogItem.meta` are stored.
3. Apply the change locally: `pnpm --filter @vcc-workflow/api prisma:push` (dev) — no migration files needed for local-first.
4. Regenerate the client if types are stale: `pnpm --filter @vcc-workflow/api prisma:generate`.

## Rules
- Relations use `onDelete: Cascade` when the child has no meaning without the parent (see `Run` → `Stage`).
- Keep enums as `String` columns; the zod schema in `@vcc-workflow/schema` is the source of allowed values, not the DB.
