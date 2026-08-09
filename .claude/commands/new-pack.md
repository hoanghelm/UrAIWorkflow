---
description: Author a new workflow pack (a reusable use case)
---

Author a new pack named `$ARGUMENTS`.

Use the `workflow-pack` skill. Steps:
1. Add a `PackManifest` for `$ARGUMENTS` to `apps/api/src/modules/packs/builtin-packs.ts`, copying `eng-loop` or `tech-diagram`.
2. Define its stages (agent + model tier + optional verify/gate), the levers it uses, and conservative guardrails.
3. Reuse existing agent/skill names where possible.
4. Run `pnpm --filter @vcc-workflow/api typecheck`.

Do not change the runner — a pack is data, the engine is fixed. If it needs new engine behavior, stop and flag it. No code comments.
