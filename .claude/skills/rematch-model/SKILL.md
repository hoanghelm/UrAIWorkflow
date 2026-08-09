---
name: rematch-model
description: Add a Rematch store model to the web app. TRIGGER when a feature needs new client state or new server-backed data in apps/web (e.g. worktrees, mining results). SKIP for local component state (use useState).
---

Client state is Rematch. One model per domain in `apps/web/src/store/models`.

## Steps
1. Create `src/store/models/<name>.ts`:
   ```
   import { createModel } from "@rematch/core";
   import { api } from "@/lib/api";
   import type { RootModel } from ".";

   interface <Name>State { /* fields */ }

   export const <name> = createModel<RootModel>()({
     state: { /* initial */ } as <Name>State,
     reducers: { /* pure setters returning new state */ },
     effects: (dispatch) => ({
       async load(payload) { /* call api, then dispatch a reducer */ },
     }),
   });
   ```
2. Register it in `src/store/models/index.ts`: add to the `RootModel` interface and the `models` object.
3. Consume in features with `useAppSelector((s) => s.<name>...)` and `useAppDispatch()`.

## Rules
- Reducers are pure and return a new state object. Side effects (HTTP, sockets) only in `effects`, and only via `lib/api.ts` / `lib/ws.ts`.
- Types come from `@vcc-workflow/schema` or the row DTOs in `lib/api.ts`.
- Copy `models/runs.ts` for a model that has list + current + streamed events.
