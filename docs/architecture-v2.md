# VCC-Workflow Architecture v2 — Three Surfaces, Versioned Packs, Stats Worker

Status: design / not yet implemented. Grounds three product decisions in research on how Claude Code models its building blocks and how comparable platforms (n8n, Dify, Flowise) handle credentials, local-vs-hosted deployment, and versioned registries.

---

## 0. What we are building

Three questions from the product owner, answered by three pillars:

1. **Two/three run surfaces.** A frontend for end users, a server that runs **locally** on the user's machine (their own subscription/key, data stays on disk), and an **optional hosted server** we operate that can also hold managed data / API keys / connectors the frontend can use.
2. **Deep understanding of the building blocks** — agent, skill, MCP, plugin — and a **worker that collects stats** about them and surfaces that in the frontend/server.
3. **Default packs that can be added and updated as versions**, so a later release can ship new packs (developer, UI/UX, ...) that existing installs pull as updates.

Provider model (owner's clarification): keep exactly what we have — **API key OR subscription login** — and **add GitHub Copilot** as a third provider behind the same abstraction. This is an axis independent of local-vs-hosted.

---

## 1. The building blocks, precisely (research-grounded)

Source: official Claude Code / Agent SDK docs (code.claude.com/docs).

| Block | What it is | Lives at | Independently versioned? | Stats signal |
|---|---|---|---|---|
| **Agent / subagent** | Specialized assistant, isolated context, own system prompt + tool allowlist | `.claude/agents/<name>.md` (+ user, + plugin) | **No** — versioned only via the plugin/git that ships it | `SubagentStart` / `SubagentStop` hooks (name, cost) |
| **Skill** | On-demand markdown instructions, user- or model-invoked | `.claude/skills/<name>/SKILL.md` (+ user, + plugin) | **No** — same | `PostToolUse` where `tool_name == "Skill"` |
| **MCP server** | External tool provider over a standard protocol | `.mcp.json` (+ `~/.claude.json`, + plugin) | **No** (external; version is the package's own) | `PostToolUse` where tool matches `mcp__<server>__<tool>` |
| **Plugin** | **Versioned bundle** of skills + agents + MCP + hooks + commands | `.claude-plugin/plugin.json` + dirs | **Yes** — semver in `plugin.json`; distributed via `marketplace.json` | Fires its components' signals |

**The load-bearing insight:** among the four, **only plugins carry a real version and a distribution channel.** Agents, skills, and MCP servers are *files*; they get a version only from the plugin (or git repo) that bundles them. A Claude plugin marketplace is a `marketplace.json` listing plugins + sources (github / git / npm / url / local) + versions, with defined auto-update rules and version resolution precedence (`plugin.json` version → marketplace entry version → git SHA → archive digest).

**Therefore: a VCC "pack" is the analog of a Claude plugin** — a versioned bundle whose *contents* are agents/skills/MCP. We version the **pack**, not each block. That is already the shape of our `Pack` table.

### What a stats worker can observe (SDK)

- Per tool call: `PreToolUse` / `PostToolUse` (tool name, input, result). MCP tools are `mcp__<server>__<tool>`; skill invocations are `PostToolUse` with `tool_name == "Skill"`.
- Per subagent: `SubagentStart` / `SubagentStop` (agent name/type, accumulated cost).
- Per session: the `init` `SystemMessage` (session id, model) and the final `ResultMessage` (`input_tokens`, `output_tokens`, `total_cost_usd`, `num_turns`, `stop_reason`).

Our `agent.subscription.ts` already parses a categorized trace (`call · [mcp:server]` / `[skill]` / `[agent]`, plus a `context ·` line from the init message). The worker does not need new SDK plumbing — it needs to **aggregate** what we already capture into a per-block usage store.

---

## 2. Current architecture — what exists, and the gaps

| Area | Today | Gap for v2 |
|---|---|---|
| **Blocks** | One `CatalogItem` table, `kind ∈ {agent, skill, command, rule, mcp, plugin, tool, pack}`. Built-ins hardcoded in `builtin-blocks.ts`, **wiped + reseeded every boot** (`deleteMany startsWith "builtin:"`). | **No `version`.** Wipe-reseed erases any provenance. Can't say "this block came from pack X @ 1.2.0". |
| **Packs** | `Pack` table **is** versioned (`@@unique([name, version])`, `installed` flag, JSON manifest); seeded by upsert. | `get()` picks "latest" by **lexical** string sort — `0.10.0` < `0.9.0` (semver bug). No per-project version pin, no "update available". |
| **Providers / keys** | `Connector` stores `apiKey`; `AgentRouter` routes `claude-agent` (subscription login) / `claude` (API key) / stub. | Key is **plaintext** in SQLite. Only **one** connector active **globally**. **No users/tenants.** No Copilot. |
| **Marketplace** | `marketplace.seed` static list + `POST /install` writes blocks into a project's `.claude`. | Not versioned, not a real registry, no update flow. |
| **Stats** | Token stats per run/stage/model/lever; `connectors.usage()` aggregates. | **Nothing aggregates per-block usage** (which agent/skill/mcp/plugin, how often) though the trace already contains it. |
| **Deployment** | One NestJS API (:3001) + Vite web (:5173) + SQLite + Docker. | **No auth, no tenancy.** Single-user local only. |

The good news: the bones for all three pillars exist. This is mostly promotion and completion, not a rewrite.

---

## 3. Pillar 1 — Three surfaces, one codebase

### 3.1 The two axes (keep them separate)

- **Deployment axis:** `DEPLOYMENT_MODE = local | hosted`.
- **Provider axis:** `key | subscription | copilot`. Same three providers exist in both deployment modes. What differs is *whose* credential and *where it's stored*.

Comparable products run the same codebase both ways with a config toggle and differ only in (a) whether auth/tenancy is on and (b) where the master secret lives (n8n Cloud vs self-host manage `N8N_ENCRYPTION_KEY` differently; Dify self-host disables `HOSTED_*` managed keys by default; Flowise Cloud manages the key its self-host asks you to provide). We adopt the same pattern.

| Concern | `local` (on the user's machine) | `hosted` (we operate) |
|---|---|---|
| Auth / users | Off — single implicit user | On — users, tenants (workspaces) |
| Operational data | SQLite + files on disk (as today) | Postgres, multi-tenant, `tenantId` on every row |
| Credentials | The user's own key/subscription/Copilot | Per-tenant vault; optionally **our managed** keys |
| `.claude` / worktrees | Real local filesystem | Per-tenant sandbox/volume |
| Managed keys | **Never** (BYO only) | Opt-in, metered (see 3.4) |

Local stays exactly as capable as today with zero auth friction. Hosted layers tenancy + a vault on top of the *same* modules.

### 3.2 Provider model (key · subscription · Copilot)

All three sit behind the existing `AgentPort`; `AgentRouter` already switches on `connector.provider`. Add a `copilot` branch and a `ClaudeCopilotAdapter` (or GitHub Copilot adapter) implementing `AgentPort`. No change to how blocks/packs/runs work — the router is the only touch point.

`Connector.provider` enum becomes: `claude-agent` (subscription login) · `claude` (Anthropic API key) · `copilot` (GitHub Copilot). A `credentialKind` derives from it: `subscription | apiKey | oauth`.

### 3.3 Credential vault (grounded in n8n / Dify / Flowise)

Two credential concepts, kept distinct (all three products separate these):

1. **Provider connector** — the credential we use to *run work* (the AI key/subscription/Copilot token). This is our `Connector`.
2. **App API key** — authenticates a caller *to our server* (needed only in `hosted`). New concept, hosted-only.

Vault rules for the provider connector:

- **Encrypt at rest.** Resolve a master key by precedence: env override → external secret manager → local key file. (n8n `N8N_ENCRYPTION_KEY`; Flowise `FLOWISE_SECRETKEY_OVERWRITE` / AWS Secrets Manager; Dify per-tenant RSA+AES.) *Local* mode may keep a generated local key file (like n8n's `~/.n8n/config`, perms `0600`); *hosted* mode should use a secret manager and, ideally, **per-tenant** keys (Dify's model) so one leaked key ≠ every tenant's secrets.
- **Redact on read.** Return a masked prefix; decrypt only server-side at execution. Our `Connector.mask()` / `hasKey` already does this shape.
- **Scope by workspace/tenant** (n8n Project, Dify/Flowise Workspace). Locally there is one implicit workspace.
- **Share read-only.** A managed connector shared into a workspace is usable but not viewable/editable by the recipient (all three enforce use-but-not-view).
- **Relax "single active connector."** Today one connector is active globally. Move to: active connector **per workspace** (hosted) / per project (local), so a user can keep a subscription and a key and switch per workspace.

"Connectors" in the third-party-integration sense (OAuth to GitHub, Figma, etc.) are the *same storage* with a different `credentialKind = oauth` — no special-casing, as in Dify/Flowise where OAuth tokens are just another encrypted blob.

### 3.4 Managed keys on the hosted server (opt-in, metered)

This is the "our hosted server holds API keys the frontend can use" feature. Adopt Dify's `HOSTED_*` shape:

- Per-provider enable flags (`managed.<provider>.enabled`) — **off by default**, matching self-hosted BYO.
- A credit pool + per-workspace quota (`quotaType`, `quotaLimit`, `quotaUsed`) so managed usage is metered and capped.
- BYO stays the default and the escape hatch; managed is opt-in. (This matches the owner's "users use their own subscription, our hosted server can also offer keys as connectors.")

### 3.5 Connector modes and the secret boundary (the crux)

Across the field, the connection object supports a **spectrum of three modes** — model our `Connector` with a mode field, not just a raw key:

1. **`local`** — raw key/subscription kept only on the local server, never synced, goes **direct to the provider**.
2. **`managed`** — encrypted at rest on our hosted control plane; the frontend calls a **proxied endpoint and never sees the key**.
3. **`external_secret`** — a *reference* resolved from Vault / a cloud secret manager at run time (n8n's External Secrets model; the raw value is never stored by us).

Two patterns worth copying directly:

- **The `user_provided` sentinel (LibreChat).** One config value flips a connector between "operator/host supplies the key" and "prompt each end user for theirs." It is the cleanest single switch between managed and BYO on the same connector — use it instead of two separate code paths.
- **The proxy boundary (Zapier / Continue Hub).** For managed and OAuth connectors, **we hold the OAuth client secret + refresh tokens and broker the call** so the raw credential never reaches the frontend — the client only ever gets a proxied endpoint. This is *the* local-vs-hosted secret boundary: local mode = key on the local server → direct to provider; hosted mode = key on our control plane → requests proxied. "Connectors" in the owner's sense (Figma, GitHub, ...) live here as `credentialKind = oauth` with auto-refresh.

Also: allow **multiple labeled connections per provider** ("Anthropic — personal", "Anthropic — team") rather than one global active connector, and grant a connection to users/workspaces via RBAC rather than baking identity into the secret (Retool's per-user-OAuth vs shared-service-account model).

---

## 4. Pillar 2 — Versioned pack & block registry

### 4.1 Model a pack as a Claude plugin

A pack = a versioned bundle whose contents are agents/skills/MCP. We already store `Pack{ name, version, manifest, installed }`. Complete it:

- **Fix latest-by-semver.** Replace the lexical `orderBy: { version: "desc" }` in `packs.service.get()` with a real semver compare so `0.10.0 > 0.9.0`.
- **Per-project install + pin.** New `ProjectPack{ projectId, packName, installedVersion }`. Installing pins a version; "update available" = a newer registry version than the pinned one.
- **Stop wiping builtins.** Give `CatalogItem` a `version` and a `source` (`builtin | pack:<name>@<ver> | user | discovered`); seed idempotently (upsert by id+version) instead of delete-all-on-boot, so provenance survives and a block can be traced to its pack.

### 4.2 The registry (how new packs ship and installs update)

- A **registry** is our analog of `marketplace.json`: a list of packs × versions × source. Built-in packs ship in-repo (as today); the **hosted server serves the registry** so the frontend can browse/install/update, and a future release's new packs (developer, UI/UX, ...) appear as new registry entries existing installs can pull.
- **Three tiers** (matching every ecosystem): `builtin` (shipped, verified) · `community` (curated) · `user` (authored locally). We already carry a `trust ∈ {verified, community}` field — extend to include the source tier.
- **Update flow:** frontend shows installed version vs latest; "Update" bumps the `ProjectPack.installedVersion` and re-materializes the pack's blocks. Auto-update on for builtin/verified, off for community/user (Claude's default policy).

Four mechanics to copy from the mature registries (n8n / Dify / Claude Code):

- **`version` is the explicit update signal, with a commit-SHA fallback** (Claude Code): an install pulls an update only when the pack's semver bumps; a version-less git source treats any new commit as an update. This decouples "ship a new pack" from "ship a new app release" — publish a new artifact and existing installs pull it. Enforce real semver (Dify breaks auto-update on non-semver — this is also our current lexical-sort bug).
- **Host-version compatibility floor** in the manifest (Dify's `meta.minimum_dify_version`): a newer pack on an older install fails loud / prompts upgrade instead of silently misbehaving.
- **Declarative, env-driven pack set for reproducible/enterprise installs** (n8n `N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV`): a pinned JSON list reconciled on startup — installs missing, corrects versions, uninstalls unlisted, with checksums for unverified sources. GitOps for the hosted side while the GUI stays for local users.
- **A `renames` map + release channels as two registries over one repo at different refs** (Claude Code stable-vs-latest): renamed/removed packs migrate existing installs automatically instead of orphaning them.

### 4.3 Shipping "developer", "UI/UX" packs later

Concretely: add a `builtin-packs` entry with a new `name` + bumped `version`; on deploy the seed upserts it into the registry; the frontend surfaces it as installable; existing users see it as new/available. No engine change — a pack is data (stages, levers, guardrails, referenced agents/skills), which is exactly the `workflow-pack` skill's premise.

---

## 5. Pillar 3 — Stats worker

### 5.1 What it produces

A `UsageStat` store keyed by block so the frontend can show: most-used agent, MCP call counts, tokens per skill, cost per pack, success/failure by stage — per project/workspace and over time.

### 5.2 How it works (no new SDK plumbing)

- **Source signals** already available: the categorized run trace (agent/skill/mcp/tool calls) our subscription adapter emits, plus the token/cost fields on `Run`/`Stage`/`LedgerEntry` and the SDK `ResultMessage`.
- **Aggregator:** a background worker (Nest scheduled task or post-run hook) folds each finished run's trace into `UsageStat{ workspaceId, blockKind, blockName, packName?, invocations, tokensIn, tokensOut, costUsd, lastUsedAt }` (upsert-increment). Runs first, then emits — same persist-then-emit rule the gateway already follows.
- **Frontend:** a stats view over `UsageStat` (counts, tokens, cost, recency) — reusing the existing usage page shape.

---

## 6. Data model changes (Prisma sketch)

Additive; nothing below breaks local single-user.

```
CatalogItem   + version String @default("0.0.0")
              + source  String @default("discovered")   // builtin | pack:<name>@<ver> | user | discovered
              (seed idempotently; stop delete-all-on-boot)

Pack          (fix semver "latest" in service; schema unchanged)
ProjectPack   { id, projectId, packName, installedVersion, createdAt }  // per-project pin
RegistrySource{ id, name, kind, url?, autoUpdate Boolean }              // builtin/community/custom

Connector     + provider now includes "copilot"
              + encrypted   Boolean @default(false)   // ciphertext vs legacy plaintext
              + workspaceId String?                   // scope (hosted); null = local implicit ws
              + ownerUserId String?                   // hosted
              + managed     Boolean @default(false)   // our key vs user's key
              + quotaType/quotaLimit/quotaUsed        // managed metering
              (relax "single global active" -> active per workspace/project)

UsageStat     { id, workspaceId?, blockKind, blockName, packName?,
                invocations Int, tokensIn Int, tokensOut Int, costUsd Float, lastUsedAt }

// hosted-only (guarded by DEPLOYMENT_MODE):
Tenant/Workspace { id, name, ... }
User             { id, email, ... }
AppApiKey        { id, tenantId, keyHash, scopes, ... }   // auth callers TO us
```

---

## 7. Phased plan (safest first)

- **Phase 0 — local wins, no breaking changes.** Fix semver "latest"; add `UsageStat` + stats worker + frontend view; give `CatalogItem` a `version`/`source` and switch seeding from wipe-reseed to idempotent upsert. All local-only, no auth.
- **Phase 1 — provider model.** Add `copilot` to the provider enum + a Copilot `AgentPort` adapter; relax single-active-connector to per-project. Encrypt `Connector.apiKey` at rest with a local key file (still local).
- **Phase 2 — registry + versioned packs.** `ProjectPack` pins, "update available" signal, registry browse/install/update, `RegistrySource` tiers. Ship one new pack (e.g. `developer`) end-to-end to prove the update path.
- **Phase 3 — hosted mode.** `DEPLOYMENT_MODE=hosted`: users/tenants/workspaces, per-tenant encrypted vault (secret-manager master key), app API keys, managed keys with quota. Postgres. Multi-tenant isolation on every query.

---

## 8. Open decisions

1. **Hosted DB:** Postgres for hosted (Prisma multi-provider) vs keep SQLite per-tenant. Recommend Postgres for hosted, SQLite for local.
2. **Per-tenant vs single master encryption key** on hosted (Dify per-tenant is stronger; single key is simpler). Recommend per-tenant for isolation.
3. **Copilot adapter surface:** does Copilot expose the same skills/MCP/subagent trace the Claude SDK does? If not, stats granularity differs per provider — the `UsageStat` schema tolerates missing block detail (falls back to run/token level).
4. **Managed-key billing:** credits vs pass-through metering. Out of scope for this doc; the quota fields make either possible.

---

## Sources

- Claude Code / Agent SDK: sub-agents, skills, mcp, plugins, plugins-reference, plugin-marketplaces, agent-sdk/agent-loop, settings (code.claude.com/docs).
- n8n: `N8N_ENCRYPTION_KEY` (AES-256-CBC, `~/.n8n/config` 0600), Projects scoping, External Secrets (6 vaults, Enterprise), credential sharing use-but-not-view (docs.n8n.io, n8n-io/n8n source).
- Dify: per-tenant RSA-2048 + AES-EAX hybrid (`api/libs/rsa.py`, `core/helper/encrypter.py`), `HOSTED_*` managed keys with trial/paid + credit pool + quota (`api/configs/feature/hosted_service`), workspace RBAC (docs.dify.ai, langgenius/dify source).
- Flowise: `FLOWISE_SECRETKEY_OVERWRITE` / `SECRETKEY_STORAGE_TYPE=aws`, node-credential vs app-API-key separation, workspace-scoped read-only credential sharing (docs.flowiseai.com, FlowiseAI/Flowise source).
- LibreChat: `user_provided` sentinel, per-user AES-256-CTR creds in Mongo (`CREDS_KEY`/`CREDS_IV`) (librechat.ai/docs, danny-avila/LibreChat source).
- Continue.dev / Cline: local `.env` / `providers.json` (0600) BYO vs hosted org-secret proxy (`api.continue.dev`) / Cline account broker (docs.continue.dev, cline.bot).
- Zapier / Make / Retool: managed-OAuth connectors (vendor holds client secret + refresh, brokered so the key never reaches the client), per-connection scoping + RBAC, per-environment resources (zapier.com/mcp, developers.make.com, docs.retool.com).
- Supabase: one-Postgres-per-project isolation + RLS; self-host = the per-project unit, cloud = the control plane that provisions N (supabase.com/docs/guides/self-hosting).
