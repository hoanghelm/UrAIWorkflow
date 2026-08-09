---
name: ui-wrapper
description: Add a wrapped UI component in the web app. TRIGGER when a feature needs an AntD or ReactFlow component that isn't already wrapped in apps/web/src/components/ui. SKIP when the component already exists in the barrel.
---

The web app never imports a component library directly outside `src/components/ui`. Wrap it once, then everyone consumes the wrapper.

## Steps
1. Create `apps/web/src/components/ui/<Name>.tsx`:
   - Import the library component, re-export its props type, and render a thin pass-through.
   - Pattern to copy (from `Button.tsx`):
     ```
     import { Button as AntButton, type ButtonProps } from "antd";
     export type { ButtonProps };
     export function Button(props: ButtonProps) {
       return <AntButton {...props} />;
     }
     ```
2. Export it from `src/components/ui/index.ts` (the barrel).
3. Use it in features via `import { <Name> } from "@/components/ui"`.

## Rules
- Wrappers are thin. Put visual defaults (theme tokens) in `ThemeProvider.tsx`, not scattered across wrappers.
- For a stateful or generic component (Table, Select) keep the generic and forward it, as `Table.tsx` does.
- No feature file may import `antd` or `@xyflow/react`. If you see one, wrap it instead.
