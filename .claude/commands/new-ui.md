---
description: Scaffold a wrapped UI component in apps/web/src/components/ui
---

Wrap a UI component named `$ARGUMENTS`.

Use the `ui-wrapper` skill. Steps:
1. Create `apps/web/src/components/ui/$ARGUMENTS.tsx` as a thin pass-through wrapper around the AntD (or ReactFlow) component, re-exporting its props type.
2. Export it from `apps/web/src/components/ui/index.ts`.
3. Confirm no feature file imports the raw library — features must use `@/components/ui`.
4. Run `pnpm --filter @vcc-workflow/web typecheck`.

Copy the shape of `Button.tsx`. No code comments.
