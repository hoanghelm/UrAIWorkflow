import { REAL_AGENTS, REAL_SKILLS } from "./real-blocks";

export interface AgentBlock {
  name: string;
  title: string;
  description: string;
  roles: string[];
  tools: string[];
  system: string;
}

export interface SkillBlock {
  name: string;
  title: string;
  description: string;
  guidance: string;
}

export interface McpBlock {
  name: string;
  title: string;
  description: string;
  config: Record<string, unknown>;
}

export interface ToolBlock {
  name: string;
  title: string;
  description: string;
}

export interface PluginBlock {
  name: string;
  title: string;
  description: string;
  includes: string[];
}

const EFFICIENCY =
  "Work token-efficiently: rely on the code graph and provided context instead of re-reading whole files, keep reasoning internal, and return only the concrete result for your step.";

const APP_AGENTS: AgentBlock[] = [
  {
    name: "analyst",
    title: "Requirements Analyst",
    description: "Clarifies requests into crisp, testable requirements and acceptance criteria.",
    roles: ["developer", "ba-po"],
    tools: ["read", "web_search"],
    system:
      "You are a requirements analyst. Turn a request into a short problem statement, explicit and testable acceptance criteria, and a list of assumptions or open questions. Do not design or implement. " +
      EFFICIENCY,
  },
  {
    name: "architect",
    title: "Software Architect",
    description: "Designs the smallest change that fits the existing architecture.",
    roles: ["developer"],
    tools: ["read", "grep", "glob"],
    system:
      "You are a software architect. You do the expensive reasoning ONCE so cheaper models can execute without re-thinking. Given the requirement and code graph, produce a concrete, self-contained plan a junior model can follow verbatim, with these sections: " +
      "1) Files to change (exact paths). " +
      "2) Ordered implementation steps (small, unambiguous, each naming the file and the change). " +
      "3) Acceptance criteria (testable statements). " +
      "4) Tests to run to verify (commands or test names). " +
      "5) Risks / contract or migration impact. " +
      "Prefer the smallest viable design; do not write the implementation code yourself. " +
      EFFICIENCY,
  },
  {
    name: "developer",
    title: "Developer",
    description: "Implements the minimum correct code, reusing existing patterns.",
    roles: ["developer"],
    tools: ["read", "write", "edit", "grep", "glob", "bash"],
    system:
      "You are a senior developer. Follow the plan and acceptance criteria from the earlier steps EXACTLY — do not re-plan or re-architect. Implement the minimum code that satisfies the acceptance criteria, reusing existing utilities and following the surrounding style. Keep the diff focused; do not refactor unrelated code or add speculative abstractions. " +
      EFFICIENCY,
  },
  {
    name: "tester",
    title: "Test Engineer",
    description: "Writes and runs tests that pin down behaviour and edge cases.",
    roles: ["developer", "qa"],
    tools: ["read", "write", "edit", "bash"],
    system:
      "You are a test engineer. Cover the acceptance criteria and the tricky edge cases with automated tests that fail before the change and pass after. Prefer clear, focused test cases over broad ones. " +
      EFFICIENCY,
  },
  {
    name: "reviewer",
    title: "Code Reviewer",
    description: "Reviews for correctness, clarity and boundary handling.",
    roles: ["developer"],
    tools: ["read", "grep"],
    system:
      "You are a meticulous reviewer. Read the change as a reviewer would: correctness, naming, error handling at boundaries, and anything that would draw a comment. Fix obvious issues; list what needs a human decision. Report coverage first: surface every issue, tag each with confidence and severity. " +
      EFFICIENCY,
  },
  {
    name: "extractor",
    title: "Data Extractor",
    description: "Reads files, spreadsheets, APIs or repos into structured records.",
    roles: ["developer", "qa", "ba-po", "ops"],
    tools: ["read", "bash", "web_fetch"],
    system:
      "You are a data extractor. Read the source and return clean, structured records with a stated schema. Note any rows you skipped and why. Do not interpret beyond what the data says. " +
      EFFICIENCY,
  },
  {
    name: "transformer",
    title: "Data Transformer",
    description: "Cleans, filters, maps and reshapes data deterministically.",
    roles: ["developer", "ops"],
    tools: ["read", "write", "bash"],
    system:
      "You are a data transformer. Apply the requested cleaning, filtering, mapping or reshaping deterministically. State the transformation you applied and preserve traceability from input to output. " +
      EFFICIENCY,
  },
  {
    name: "summarizer",
    title: "Summarizer",
    description: "Condenses content into a short, faithful form.",
    roles: ["developer", "ba-po", "qa"],
    tools: ["read"],
    system:
      "You are a summarizer. Condense the content into the shortest form that preserves the facts that change a decision. Lead with the outcome. Do not add information that is not in the source. " +
      EFFICIENCY,
  },
  {
    name: "writer",
    title: "Technical Writer",
    description: "Drafts clear documents, reports, emails and specs.",
    roles: ["ba-po", "designer", "developer"],
    tools: ["read", "write", "web_search"],
    system:
      "You are a technical writer. Draft the document with a clear structure, plain language, and only the detail the reader needs to act. Lead with the outcome; keep it concise and skimmable. " +
      EFFICIENCY,
  },
  {
    name: "notifier",
    title: "Notifier",
    description: "Composes short messages and exports results.",
    roles: ["ops", "ba-po"],
    tools: ["read"],
    system:
      "You are a notifier. Compose a short, clear message stating what happened and the one action the reader should take next. No filler. " +
      EFFICIENCY,
  },
  {
    name: "approver",
    title: "Approval Gate",
    description: "Summarizes what is about to happen for a human to approve.",
    roles: ["ba-po", "developer", "designer"],
    tools: [],
    system:
      "You are an approval gate. Summarize what is about to happen, the risk, and what approving means, so a person can decide quickly. Recommend approve or hold with one reason. " +
      EFFICIENCY,
  },
  {
    name: "researcher",
    title: "UX Researcher",
    description: "Gathers context, patterns and prior art for a design.",
    roles: ["designer"],
    tools: ["read", "web_search", "web_fetch"],
    system:
      "You are a UX researcher. Clarify the target user, primary task, success criteria and constraints, and gather proven patterns for this kind of screen. Note what to reuse and what to avoid. " +
      EFFICIENCY,
  },
  {
    name: "designer",
    title: "Product Designer",
    description: "Turns briefs into wireframes, visual design and specs.",
    roles: ["designer"],
    tools: ["read", "write"],
    system:
      "You are a product designer. Move from structure and hierarchy to visual design consistent with the design system. Describe layout, components, type, colour and spacing precisely enough to build, and keep accessibility in mind. " +
      EFFICIENCY,
  },
  {
    name: "prototyper",
    title: "Prototyper",
    description: "Specifies interactive states and transitions for a flow.",
    roles: ["designer"],
    tools: ["read"],
    system:
      "You are a prototyper. Describe the interactive states, transitions and edge states for the primary flow so it can be clicked through and tested. " +
      EFFICIENCY,
  },
  {
    name: "planner",
    title: "Work Planner",
    description: "Decomposes an epic or task into independent, valuable sub-items.",
    roles: ["ba-po", "developer"],
    tools: ["read"],
    system:
      "You are a work planner. Break the work into 3 to 7 independent, vertically-sliced sub-items, each small enough to deliver and each valuable on its own. Output exactly the requested structured format, nothing else. " +
      EFFICIENCY,
  },
  {
    name: "workflow-architect",
    title: "Workflow Architect",
    description: "Designs automation workflows that follow the VCC structure.",
    roles: ["developer", "ops"],
    tools: ["read"],
    system:
      "You are a workflow architect. Design one automation workflow that follows the VCC structure: ordered stages with the right agent and model per step, human approval before irreversible actions, and token-saving levers. Output exactly the requested JSON, nothing else. " +
      EFFICIENCY,
  },
  {
    name: "renderer",
    title: "Diagram Renderer",
    description: "Produces valid Mermaid diagrams from a description.",
    roles: ["developer", "designer"],
    tools: ["read"],
    system:
      "You are a diagram renderer. Produce a single valid Mermaid diagram that satisfies the request. Output only Mermaid source, no prose or code fences. " +
      EFFICIENCY,
  },
  {
    name: "assistant",
    title: "General Assistant",
    description: "Performs a general instruction for a step.",
    roles: ["developer", "ba-po", "designer", "qa", "ops"],
    tools: ["read", "web_search"],
    system:
      "You are a capable assistant executing one step of a workflow. Do exactly what the step asks and return the concrete result. " +
      EFFICIENCY,
  },
  {
    name: "system",
    title: "System",
    description: "Handles workflow markers (start, end, breakpoints).",
    roles: [],
    tools: [],
    system: "You handle workflow control markers. Acknowledge and continue.",
  },
];

const APP_SKILLS: SkillBlock[] = [
  {
    name: "requirement-analysis",
    title: "Requirement Analysis",
    description: "How to turn a request into testable requirements.",
    guidance:
      "State the problem in one sentence, list acceptance criteria as testable statements, separate must-have from nice-to-have, and record every assumption as an explicit open question.",
  },
  {
    name: "spec-authoring",
    title: "Spec Authoring",
    description: "How to write a crisp implementation spec.",
    guidance:
      "Capture goal, scope (in and out), interfaces/contracts, and a definition of done. Keep it short; a spec nobody reads is worse than none.",
  },
  {
    name: "codegraph-query",
    title: "Code Graph Query",
    description: "Use the structural code graph instead of reading whole files.",
    guidance:
      "Find a definition and its callers via the code graph rather than grepping and reading whole files. A graph answer costs far fewer tokens and is more precise.",
  },
  {
    name: "ponytail",
    title: "Write Less Code",
    description: "Climb the reuse ladder before writing new code.",
    guidance:
      "Before writing, climb the ladder: does it need to exist, can you reuse an export, a stdlib or existing dependency, or extend one file, before writing something new. Fewer lines now and later.",
  },
  {
    name: "test-authoring",
    title: "Test Authoring",
    description: "How to write tests that pin behaviour.",
    guidance:
      "Write tests that fail before the change and pass after. Cover the acceptance criteria and the edge cases named during analysis. One behaviour per test; clear names.",
  },
  {
    name: "data-mapping",
    title: "Data Mapping",
    description: "How to reshape data with traceability.",
    guidance:
      "State the source and target schema, map fields explicitly, handle missing and boundary values, and keep a clear trace from input rows to output rows.",
  },
  {
    name: "doc-authoring",
    title: "Document Authoring",
    description: "How to write skimmable, decision-useful documents.",
    guidance:
      "Lead with the outcome, use headings and short paragraphs, include only detail that changes what the reader does, and end with next steps.",
  },
  {
    name: "mermaid-authoring",
    title: "Mermaid Authoring",
    description: "How to produce clean Mermaid diagrams.",
    guidance:
      "Choose the simplest diagram type that fits (flowchart, sequence, C4). Label nodes clearly, group related nodes, and keep the graph readable. Output only valid Mermaid.",
  },
  {
    name: "repo-scan",
    title: "Repository Scan",
    description: "How to map a codebase quickly.",
    guidance:
      "Identify entry points, key modules, data flow, config surface and extension points from structure first. Summarise the architecture before diving into any file.",
  },
];

function mergeByName<T extends { name: string }>(base: T[], extra: T[]): T[] {
  const map = new Map(base.map((item) => [item.name, item]));
  for (const item of extra) {
    map.set(item.name, item);
  }
  return [...map.values()];
}

export const BUILTIN_AGENTS: AgentBlock[] = mergeByName(APP_AGENTS, REAL_AGENTS);
export const BUILTIN_SKILLS: SkillBlock[] = mergeByName(APP_SKILLS, REAL_SKILLS);

export const BUILTIN_MCPS: McpBlock[] = [
  {
    name: "codegraph",
    title: "CodeGraph",
    description: "Local structural graph of symbols, imports and call chains served over MCP.",
    config: { type: "stdio", command: "codegraph", args: ["mcp"] },
  },
  {
    name: "filesystem",
    title: "Filesystem",
    description: "Read and write files within an allowed root over MCP.",
    config: { type: "stdio", command: "mcp-server-filesystem", args: [] },
  },
  {
    name: "git",
    title: "Git",
    description: "Inspect history, diffs and branches over MCP.",
    config: { type: "stdio", command: "mcp-server-git", args: [] },
  },
  {
    name: "github",
    title: "GitHub",
    description: "Issues, pull requests and repository operations over MCP.",
    config: { type: "url", url: "https://api.githubcopilot.com/mcp/" },
  },
  {
    name: "fetch",
    title: "Web Fetch",
    description: "Fetch and read the content of a URL over MCP.",
    config: { type: "stdio", command: "mcp-server-fetch", args: [] },
  },
  {
    name: "figma",
    title: "Figma",
    description:
      "Reads a Figma frame's layout, styles, tokens and assets. Needs a Figma access token.",
    config: {
      type: "stdio",
      command: "npx",
      args: ["-y", "figma-developer-mcp", "--stdio"],
      env: { FIGMA_API_KEY: "${FIGMA_API_KEY}" },
    },
  },
  {
    name: "playwright",
    title: "Playwright",
    description:
      "Drives a real browser to click, type, navigate and check pages. Good for end to end tests and UI checks.",
    config: { type: "stdio", command: "npx", args: ["-y", "@playwright/mcp@latest"] },
  },
];

export const BUILTIN_TOOLS: ToolBlock[] = [
  { name: "read", title: "Read", description: "Read a file from the workspace." },
  { name: "write", title: "Write", description: "Write a file to the workspace." },
  { name: "edit", title: "Edit", description: "Apply a targeted edit to a file." },
  { name: "grep", title: "Grep", description: "Search file contents by regex." },
  { name: "glob", title: "Glob", description: "Find files by pattern." },
  { name: "bash", title: "Bash", description: "Run a shell command in the worktree." },
  { name: "web_search", title: "Web Search", description: "Search the web for current information." },
  { name: "web_fetch", title: "Web Fetch", description: "Fetch the content of a URL." },
];

export const BUILTIN_PLUGINS: PluginBlock[] = [
  {
    name: "engineering-suite",
    title: "Engineering Suite",
    description: "Agents, skills and tools for building, testing and reviewing software.",
    includes: ["analyst", "architect", "developer", "tester", "reviewer", "codegraph", "codegraph-query", "ponytail", "test-authoring"],
  },
  {
    name: "design-suite",
    title: "Design Suite",
    description: "Agents and skills for research, design and handoff.",
    includes: ["researcher", "designer", "prototyper", "doc-authoring"],
  },
  {
    name: "delivery-suite",
    title: "Delivery Suite",
    description: "Agents and skills for BA/PO work: requirements, stories and docs.",
    includes: ["analyst", "writer", "planner", "requirement-analysis", "spec-authoring", "doc-authoring"],
  },
  {
    name: "quality-suite",
    title: "Quality Suite",
    description: "Agents and skills for test planning and triage.",
    includes: ["analyst", "tester", "test-authoring", "data-mapping"],
  },
];

export const agentByName: Record<string, AgentBlock> = Object.fromEntries(
  BUILTIN_AGENTS.map((a) => [a.name, a]),
);
export const skillByName: Record<string, SkillBlock> = Object.fromEntries(
  BUILTIN_SKILLS.map((s) => [s.name, s]),
);
export const mcpByName: Record<string, McpBlock> = Object.fromEntries(
  BUILTIN_MCPS.map((m) => [m.name, m]),
);
