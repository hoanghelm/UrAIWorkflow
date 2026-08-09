# Tools (token-saving toolchain)

These are the levers the product ships — we dogfood them while building it. See skill `token-efficient-coding`.

## CodeGraph (MCP) — structural context
Wired in `.mcp.json` as the `codegraph` server. It builds a local graph of symbols, imports, and call chains and serves it over MCP. Use its tools to find a definition or its callers instead of grepping and reading whole files — a graph answer costs far fewer tokens.

Verify the invocation once on this machine: install/run CodeGraph and confirm the command and args in `.mcp.json` match your install (package/binary name may differ from `@codegraph/mcp`). Restart the agent after changing `.mcp.json`.

## Ponytail — write less code
A generation discipline, not a server: before writing code, climb the ladder (does it need to exist → reuse an export → stdlib/existing dep → extend one file → only then write new). Fewer lines now and later.

## Caveman — terse output
Keep explanations minimal; preserve code, types, and command output exactly, trim the prose around them.

## RTK (Rust Token Killer) — tool-output compression (optional, later)
A transparent shell proxy that compresses noisy command output (git, tests) before it enters context. Add it to the local dev shell when working in loops that run many commands. Not required to build the app.

## Order of use
1. CodeGraph to understand structure.
2. Ponytail to plan the smallest change.
3. Write + typecheck.
4. Caveman when reporting back.
