---
name: workflow-pack
description: Author a new workflow pack (a reusable use case). TRIGGER when adding a pack like image-gen, report-ops, or test-gen. A pack is a manifest of stages, levers and guardrails — no new engine code.
---

A pack is a declarative use case. Adding one should need a manifest and (optionally) skill files — not changes to the runner.

## Steps
1. Add a `PackManifest` to `apps/api/src/modules/packs/builtin-packs.ts`. Copy `eng-loop` or `tech-diagram`.
2. Fill the manifest (shape defined in `@vcc-workflow/schema` `packManifestSchema`):
   - `name`, `version`, `description`, `triggers`.
   - `stages`: each has `id`, `title`, `agent`, `model` (`opus` for planning, `sonnet` for building, `haiku` for cheap steps), `skills`, optional `verify`, optional `gate` (human approval).
   - `levers`: which token-savers apply (`codegraph`, `rtk`, `ponytail`, `caveman`, `routing`, `disclosure`).
   - `guardrails`: `maxRetries`, `maxLoopDepth`, `budget.tokens`, `stageTimeoutMs`, `requireHumanGate`, `onBreach`.
   - `trust`: `verified` for curated packs.
3. Restart the API — `PacksService.seed()` inserts new manifests on boot.

## Rules
- Prefer reusing existing agent and skill names over inventing new ones.
- Set conservative guardrails by default; a pack can be loosened later, not silently run unbounded.
- If a pack truly needs new engine behavior, stop and raise it — the goal is packs = data, engine = fixed.
