import type { z } from "zod";
import type { marketplaceItemSchema } from "@vcc-workflow/schema";

type Item = z.input<typeof marketplaceItemSchema>;

export const marketplaceSeed: Item[] = [
  { id: "tpl-senior-fullstack", kind: "template", name: "Senior Fullstack", description: "Everything to ship full-stack features: code review, API design, testing strategy and a commit flow.", author: "vcc", tags: ["development"], stars: 6481, source: "", install: "senior-fullstack", bundle: ["agent-code-reviewer", "skill-api-design", "skill-testing-strategy", "cmd-commit", "cmd-new-module"] },
  { id: "tpl-react-app", kind: "template", name: "React App", description: "React + TypeScript best practices: API design skill, code review, PR review command and format-on-save.", author: "vcc", tags: ["web-development"], stars: 3934, source: "", install: "react-app", bundle: ["skill-api-design", "agent-code-reviewer", "cmd-review-pr", "hook-format-on-save"] },
  { id: "tpl-token-saver", kind: "template", name: "Token Saver", description: "The full token-efficiency stack — CodeGraph, Ponytail and Caveman wired together.", author: "vcc", tags: ["tokens"], stars: 9200, source: "", install: "token-saver", bundle: ["skill-ponytail", "skill-caveman", "mcp-codegraph", "skill-token-efficient"] },
  { id: "tpl-frontend-design", kind: "template", name: "Frontend Design", description: "Distinctive, production-grade UI work: docs, token-efficient coding and formatting.", author: "vcc", tags: ["creative-design"], stars: 4870, source: "", install: "frontend-design", bundle: ["agent-docs-writer", "skill-token-efficient", "hook-format-on-save"] },

  { id: "skill-ponytail", kind: "skill", name: "ponytail", description: "Makes the agent write the least code that works — a decision ladder before generating.", author: "DietrichGebert", tags: ["tokens", "codegen"], stars: 74000, source: "https://github.com/DietrichGebert/ponytail", install: "ponytail" },
  { id: "skill-caveman", kind: "skill", name: "caveman", description: "Telegraphic output style that strips filler while keeping code intact. ~65% fewer output tokens.", author: "JuliusBrussee", tags: ["tokens", "output"], stars: 92000, source: "https://github.com/JuliusBrussee/caveman", install: "caveman" },
  { id: "skill-token-efficient", kind: "skill", name: "token-efficient-coding", description: "Combine CodeGraph, Ponytail and Caveman to spend the fewest tokens on any coding task.", author: "vcc", tags: ["tokens"], stars: 0, source: "", install: "token-efficient-coding" },
  { id: "skill-api-design", kind: "skill", name: "api-design", description: "Design consistent, versioned REST/RPC APIs with clear error contracts.", author: "community", tags: ["backend"], stars: 1200, source: "", install: "api-design" },
  { id: "skill-testing-strategy", kind: "skill", name: "testing-strategy", description: "Pick the right test layers and write meaningful, non-brittle tests.", author: "community", tags: ["testing"], stars: 900, source: "", install: "testing-strategy" },

  { id: "agent-code-reviewer", kind: "agent", name: "code-reviewer", description: "Reviews a diff against project rules and reports ranked findings. Read-only.", author: "vcc", tags: ["review"], stars: 0, source: "", install: "code-reviewer" },
  { id: "agent-security-auditor", kind: "agent", name: "security-auditor", description: "Scans changes for injection, secrets and unsafe patterns before commit.", author: "community", tags: ["security"], stars: 2100, source: "", install: "security-auditor" },
  { id: "agent-test-writer", kind: "agent", name: "test-writer", description: "Generates unit and integration tests for the changed surface.", author: "community", tags: ["testing"], stars: 1500, source: "", install: "test-writer" },
  { id: "agent-docs-writer", kind: "agent", name: "docs-writer", description: "Writes and updates README and inline docs from the code.", author: "community", tags: ["docs"], stars: 1100, source: "", install: "docs-writer" },

  { id: "cmd-commit", kind: "command", name: "commit", description: "Stage, write a conventional commit message and commit.", author: "community", tags: ["git"], stars: 3400, source: "", install: "commit" },
  { id: "cmd-review-pr", kind: "command", name: "review-pr", description: "Fetch a PR and produce a structured review.", author: "community", tags: ["git", "review"], stars: 2200, source: "", install: "review-pr" },
  { id: "cmd-new-module", kind: "command", name: "new-module", description: "Scaffold a new backend feature module.", author: "vcc", tags: ["scaffold"], stars: 0, source: "", install: "new-module" },

  { id: "hook-format-on-save", kind: "hook", name: "format-on-save", description: "Run the formatter after every file edit.", author: "community", tags: ["quality"], stars: 800, source: "", install: "format-on-save" },
  { id: "hook-block-secrets", kind: "hook", name: "block-secrets", description: "Block tool calls that would write API keys or secrets to disk.", author: "community", tags: ["security"], stars: 1900, source: "", install: "block-secrets" },
  { id: "hook-notify-on-stop", kind: "hook", name: "notify-on-stop", description: "Send a desktop notification when a run finishes or needs input.", author: "community", tags: ["dx"], stars: 600, source: "", install: "notify-on-stop" },

  { id: "mcp-codegraph", kind: "mcp", name: "codegraph", description: "Local code knowledge graph over MCP — cut tokens ~47% by querying structure, not files.", author: "codegraph-ai", tags: ["tokens", "context"], stars: 47000, source: "https://github.com/codegraph-ai/CodeGraph", install: "@codegraph/mcp" },
  { id: "mcp-filesystem", kind: "mcp", name: "filesystem", description: "Read and write files under an allowed root over MCP.", author: "modelcontextprotocol", tags: ["files"], stars: 15000, source: "https://github.com/modelcontextprotocol/servers", install: "@modelcontextprotocol/server-filesystem" },
  { id: "mcp-github", kind: "mcp", name: "github", description: "Query issues, PRs and repos over MCP.", author: "modelcontextprotocol", tags: ["git"], stars: 15000, source: "https://github.com/modelcontextprotocol/servers", install: "@modelcontextprotocol/server-github" },
  { id: "mcp-postgres", kind: "mcp", name: "postgres", description: "Run read-only SQL against a Postgres database over MCP.", author: "modelcontextprotocol", tags: ["data"], stars: 15000, source: "https://github.com/modelcontextprotocol/servers", install: "@modelcontextprotocol/server-postgres" },

  { id: "plugin-scaffolding", kind: "plugin", name: "scaffolding", description: "Spec-driven multi-agent orchestration plugin with per-phase model tiers.", author: "komluk", tags: ["orchestration"], stars: 15, source: "https://github.com/komluk/scaffolding", install: "scaffolding" },
  { id: "plugin-spec-kit", kind: "plugin", name: "spec-kit", description: "Spec-driven development: specify → plan → tasks → implement, across many agents.", author: "github", tags: ["spec"], stars: 124000, source: "https://github.com/github/spec-kit", install: "spec-kit" },
  { id: "plugin-claude-flow", kind: "plugin", name: "claude-flow", description: "Multi-agent swarm orchestration for Claude Code.", author: "ruvnet", tags: ["orchestration"], stars: 65000, source: "https://github.com/ruvnet/ruflo", install: "claude-flow" },
];
