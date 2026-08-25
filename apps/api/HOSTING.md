# Hosting the VCC-Workflow backend (option B)

The UI (`apps/web`) stays on each user's machine. The backend (`apps/api`) — which owns the **runner** and the **AI-model connectors** — can run locally (default) or on a remote server. The UI picks which backend to talk to via the **Servers** switcher in the top bar.

## Run the backend on a server

Set these environment variables on the server, then start `apps/api`:

| Variable | Value | Purpose |
|---|---|---|
| `DEPLOYMENT_MODE` | `hosted` | Turns on the auth guard. |
| `HOSTED_ACCESS_TOKEN` | a long random secret | The token the UI must send as `Authorization: Bearer <token>`. |
| `WEB_ORIGIN` | `*` or `https://a.com,https://b.com` | CORS allow-list for the UIs that connect. `*` reflects any origin. |
| `DATABASE_URL` | your Postgres URL | Hosted data store. Generate the schema/migrations with `pnpm run gen:pg-schema` then `pnpm run prisma:pg:deploy`. |
| `PORT` | e.g. `3001` | Listen port. |
| `WORKSPACES_ROOT` | e.g. `/srv/vcc/workspaces` | Where cloned/provisioned projects live on the server. |

`/api/health` and `/api/whoami` stay public (used for connection tests); every other route requires the bearer token in hosted mode. `/api/whoami` also advertises the model-access policy below, so connecting UIs only offer what the server allows.

## Model-access policy (what clients may use)

The server decides which models and which connection modes (BYOK / Claude subscription / Copilot) are available, and whether clients may manage connectors at all. Set these on the server:

| Variable | Value | Purpose |
|---|---|---|
| `ALLOWED_MODELS` | csv of `opus,sonnet,haiku` | Which model tiers the server exposes. A client request for a disallowed tier is downgraded to an allowed one server-side. Default: all three. |
| `ALLOWED_PROVIDERS` | csv of `claude-agent,claude,copilot` | Which connector types clients may add — `claude-agent` (Claude Pro/Max subscription), `claude` (Anthropic API key, BYOK), `copilot` (GitHub Copilot). Ignored when connectors are locked. Default: all three. |
| `CONNECTORS_LOCKED` | `true` / `false` | When `true`, the host owns the connectors: clients can pick which one a workspace runs on but cannot add/edit/delete/activate them. Defaults to `true` in hosted mode, `false` locally. Set `CONNECTORS_LOCKED=false` in hosted mode to let clients bring their own. |

Enforcement is server-side (agent adapters clamp the model tier; a guard blocks connector mutations when locked) — the UI merely reflects the same policy by filtering its model pickers and provider list. `GET` and connector `test` always stay allowed so clients can verify the host's setup.

## Connect a local UI to it

In the app's top bar → **Servers** (the ⚡ server chip) → **Add a server**:
- **Name** — anything, e.g. "Team server"
- **URL** — `https://your-server.example.com`
- **Access token** — the `HOSTED_ACCESS_TOKEN`
- **Test** — hits `/api/whoami`; shows the mode and whether a token is required
- **Add**, then **Use** — the UI reloads and now talks to that server for all API + socket traffic

"This computer" is always available to switch back to the local backend.

## What runs where

- The **runner executes on whichever backend is active** — so on a hosted server it makes git worktrees and edits files **on the server**. Projects for hosted use live on the server (clone/upload them there).
- **Connectors** (Claude / Copilot) are configured on the backend that runs the runner — i.e. on the server for hosted use.

## Not yet in this phase

- Per-user accounts / multi-tenant isolation (one shared token today).
