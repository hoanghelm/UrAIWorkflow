---
description: Scaffold a new NestJS feature module in apps/api
---

Create a new backend feature module named `$ARGUMENTS`.

Use the `nestjs-module` skill. Steps:
1. Create `apps/api/src/modules/$ARGUMENTS/` with `$ARGUMENTS.service.ts`, `$ARGUMENTS.controller.ts`, and `$ARGUMENTS.module.ts` (add a `.gateway.ts` only if it needs realtime).
2. Take any shared shapes from `@vcc-workflow/schema`; if one is missing, add it there first via the schema-engineer agent.
3. Register the module in `apps/api/src/app.module.ts`.
4. Run `pnpm --filter @vcc-workflow/api typecheck` and fix errors.

Keep it minimal — copy the shape of `modules/ledger`. No code comments.
