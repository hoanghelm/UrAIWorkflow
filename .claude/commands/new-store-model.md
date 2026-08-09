---
description: Scaffold a Rematch store model in apps/web
---

Create a Rematch store model named `$ARGUMENTS`.

Use the `rematch-model` skill. Steps:
1. Create `apps/web/src/store/models/$ARGUMENTS.ts` with state, pure reducers, and effects that call `@/lib/api`.
2. Register it in `apps/web/src/store/models/index.ts` (add to the `RootModel` interface and the `models` object).
3. Consume it in the relevant feature via `useAppSelector` / `useAppDispatch`.
4. Run `pnpm --filter @vcc-workflow/web typecheck`.

Copy the shape of `models/runs.ts`. No code comments.
