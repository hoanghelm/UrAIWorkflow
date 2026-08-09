# VCC-Workflow — Product Plan (Software-Engineer focus)

**Updated:** 2026-08-03

## The one-line thesis
A local-first workspace where a software engineer (or a co-worker) composes and runs token-efficient AI workflows against their repos — with a marketplace of skills/agents/packs, a measured "tokens saved" ledger, and expanding use-case packs (diagrams, docs, tests, images).

## Who we optimize for first
**The software engineer.** Everything below is prioritized by "does it make a real dev's day cheaper/faster on their own codebase."

---

## What's DONE (working, verified)
- Monorepo (NestJS + React + shared zod), real SQLite **migrations**.
- **Workflow engine**: plan→act→verify→decide loop, guardrails (retries, loop depth, budget, human gates, breakpoints), checkpoints, ledger.
- **Connectors**: real Claude SDK adapter (BYOK) + stub fallback.
- **Catalog**: discovers `.claude` resources per project; per-project counts.
- **Marketplace + Templates**: 26 components, template bundles, real install into `.claude`, per-kind file content + Code/Preview.
- **Web**: Workspace list → VS-Code explorer + sessions, Browse (virtualized, ⌘K search), Build (drag-drop generic actions), Packs + detail, Tokens dashboard, Runs (pipeline/logs/ledger), dark mode, TanStack Query.

## What's NOT done (the gaps)
1. **Real token-lever execution** — savings are estimated; levers don't yet transform the actual request/response.
2. **Mining engine** — marketplace is a curated seed, not live GitHub mining.
3. **Triggers** — runs are manual only; no scheduled/event runs.
4. **Data mapping + branching** — runner is linear; no `{{ step.output }}` mapping or IF/Switch.
5. **Copilot SDK adapter** — only Claude is wired.
6. **Diagrams / Figma / image packs** — the "expand use cases" packs aren't built.

---

## SE-focused feature analysis (what to build, and why)

### Tier 1 — highest leverage for engineers (build next)
| Feature | Why it matters to an SE | Effort |
|---|---|---|
| **Architecture diagrams (Mermaid/C4)** | Devs constantly need up-to-date diagrams; auto-generate from the repo/catalog and render in-app. Diagram-as-code lives in the repo. | S–M |
| **Real token levers in the loop** | The whole value prop. Apply Caveman/Ponytail as prompt directives, RTK to compress tool output, CodeGraph via MCP — and measure the *real* delta. | M |
| **Triggers (manual + scheduled)** | "Run tests nightly", "regenerate the diagram on demand" — a workflow that runs many times. | M |
| **Mining engine (repo → recommended components)** | Scan the repo's stack, recommend the right skills/packs. The defensible wedge. | M–L |

### Tier 2 — strong SE value
| Feature | Why | Effort |
|---|---|---|
| **Copilot SDK adapter** | Meet engineers where they are; route hard phases to Claude, cheap to Copilot models. | M |
| **Data mapping between steps** (`{{ steps.x.output }}`) | Turns a prompt-chain into a real automation. | M |
| **Test-gen / docs-gen / PR-review packs** | Concrete daily-driver packs on the existing engine. | S each |
| **Session workspace UI** (VS-Code-style sessions + result pane) | The "agent window" the user asked for. | M |

### Tier 3 — expansion / non-engineer reach
| Feature | Why | Effort |
|---|---|---|
| **Figma integration** | Import a Figma frame → generate component scaffolds; or export diagrams to Figma. Needs Figma OAuth + REST API + a token. | L |
| **Image generation pack** | Brand assets / illustrations. Needs an image model key. | M |
| **Branching / loops in the engine** | IF/Switch/Merge for real business logic. | L |
| **Office-ops packs** (report gen, data ops) | Co-worker reach. | S each |

### Explicit dependency notes (why some can't be "finished" locally)
- **Figma** needs a Figma personal-access-token / OAuth app + network — can't be completed without the user's Figma account.
- **Real RTK / CodeGraph** need those tools installed on the machine (RTK binary, CodeGraph MCP) — the *wiring* is ours, the *tools* are external.
- **Copilot SDK** needs the SDK package + a Copilot/BYOK key.
- **Real model runs** need an Anthropic key (Connectors) — with a stub, savings are estimated.

---

## Phased roadmap
- **Phase A (this iteration):** seed-under-migrations · Mermaid diagrams (generate-from-project + editor) · triggers (manual+scheduled) · make levers actually apply in the Claude adapter.
- **Phase B:** mining engine (stack detect → recommend) · test-gen/docs-gen/pr-review packs · data mapping between steps.
- **Phase C:** Copilot SDK adapter · session-workspace UI · branching in the engine.
- **Phase D:** Figma integration · image-gen pack · office-ops packs.

## Where the diagram + Figma asks land
- **Diagrams:** Phase A — build now. Generate Mermaid from the project's real catalog/structure, render in-app, editable, saved to the repo as `.md`/`.mmd`. This is genuinely useful with zero external deps.
- **Figma:** Phase D — needs the user's Figma token; plan is import-frame→scaffold and export-diagram→Figma, behind a connector like the model connectors.
