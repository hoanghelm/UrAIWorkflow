---
name: token-efficient-coding
description: How to write code in this repo while spending the fewest tokens. TRIGGER when starting any coding task — before reading files broadly, generating code, or exploring the codebase. Combines CodeGraph (structure), Ponytail (write less), and Caveman (terse output).
---

Spend tokens on the change, not on rediscovering the codebase. Three levers, applied in order.

## 1. CodeGraph — understand structure without reading files
Before opening many files, query the CodeGraph MCP tools (see `.claude/rules/tools.md`) to find a symbol, its definition, and its call sites. Reading a graph answer is far cheaper than grepping and reading whole files. Only open the specific files the graph points you to.

## 2. Ponytail — write the least code that works
Before writing new code, climb the ladder:
1. Does this need to exist at all?
2. Can an existing export in this repo do it? (search first)
3. Can the standard library or an already-installed dependency do it?
4. Can you extend one file instead of adding several?
Only then write new code — the smallest version that passes typecheck. Fewer lines = fewer tokens now and later.

## 3. Caveman — keep prose terse
When explaining a change, drop filler. Report what changed and why in as few words as possible. Keep code, types, and command output intact and exact; trim everything else.

## Always
- Prefer editing over creating; prefer reusing an export over writing a function.
- Verify with the package's `typecheck` / `build` before declaring done.
- These are the same levers the product ships (`codegraph`, `ponytail`, `caveman`) — dogfood them.
