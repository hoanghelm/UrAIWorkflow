---
name: nestjs-module
description: Add a new feature module to the NestJS API. TRIGGER when creating a new backend capability under apps/api/src/modules (e.g. mining, registry, worktree). SKIP for edits to an existing module.
---

A feature module is a folder `apps/api/src/modules/<name>` with three or four files.

## Steps
1. Create the folder and files:
   - `<name>.service.ts` — business logic. Inject `PrismaService` and any other services. Methods return schema types from `@vcc-workflow/schema`.
   - `<name>.controller.ts` — HTTP routes under `@Controller("<name>")`. Validate bodies with `new ZodValidationPipe(schema)`.
   - `<name>.module.ts` — declares controllers + providers; `exports` the service if other modules use it.
   - `<name>.gateway.ts` — only if the feature streams realtime events (socket.io). Persist first, then emit.
2. Register the module in `apps/api/src/app.module.ts` imports.
3. If it needs new persistence, add the model via the `prisma-model` skill first.
4. Run `pnpm --filter @vcc-workflow/api typecheck`.

## Shape to copy
Follow `modules/ledger` for a simple read/write module, or `modules/runner` for one with a gateway and an injected port. Keep names domain-based and singular where natural.
