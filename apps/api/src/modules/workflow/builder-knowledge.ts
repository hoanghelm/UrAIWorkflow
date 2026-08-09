export interface ActionSpec {
  action: string;
  agent: string;
  model: "opus" | "sonnet" | "haiku";
  purpose: string;
}

export const CORE_ACTIONS: ActionSpec[] = [
  { action: "start", agent: "system", model: "haiku", purpose: "Marks where the workflow begins." },
  { action: "ai-task", agent: "assistant", model: "sonnet", purpose: "General instruction for the AI to perform." },
  { action: "extract-data", agent: "extractor", model: "haiku", purpose: "Read a file, spreadsheet, API or repo." },
  { action: "transform", agent: "transformer", model: "sonnet", purpose: "Clean, filter, map or reshape data." },
  { action: "summarize", agent: "summarizer", model: "haiku", purpose: "Condense content into a short form." },
  { action: "generate-doc", agent: "writer", model: "sonnet", purpose: "Draft a document, report, email or code." },
  { action: "review", agent: "reviewer", model: "sonnet", purpose: "Quality-check the previous step's output." },
  { action: "subworkflow", agent: "system", model: "sonnet", purpose: "Run another workflow (pack) inside this one." },
  { action: "notify", agent: "notifier", model: "haiku", purpose: "Send a message or export the result." },
  { action: "approval", agent: "approver", model: "sonnet", purpose: "Pause for a person to approve (human gate)." },
  { action: "break", agent: "system", model: "haiku", purpose: "Pause here for review, then continue." },
  { action: "end", agent: "system", model: "haiku", purpose: "Marks where the workflow finishes." },
];

export const CORE_SKILLS = [
  "spec-authoring",
  "requirement-analysis",
  "codegraph-query",
  "ponytail",
  "data-mapping",
  "doc-authoring",
  "mermaid-authoring",
  "test-authoring",
];

export const CORE_LEVERS: Record<string, string> = {
  codegraph: "Use a structural code graph instead of reading whole files (fewer tokens).",
  rtk: "Compress noisy tool output before it enters context.",
  ponytail: "Write the minimum code; reuse before writing new.",
  caveman: "Terse output — keep code/errors exact, trim prose.",
  routing: "Route each step to the cheapest capable model.",
  disclosure: "Only include the context a step actually needs.",
};

const EXAMPLE = {
  name: "weekly-sales-report",
  pack: "custom",
  inputs: {},
  stages: [
    { id: "start", title: "Start", action: "start", agent: "system", model: "haiku", skills: [], tools: [] },
    {
      id: "extract",
      title: "Read sales data",
      action: "extract-data",
      agent: "extractor",
      model: "haiku",
      instruction: "Read the sales spreadsheet and load rows as records.",
      skills: ["data-mapping"],
      tools: [],
    },
    {
      id: "summarize",
      title: "Summarize trends",
      action: "summarize",
      agent: "summarizer",
      model: "sonnet",
      instruction: "Compute weekly totals and highlight the top movers.",
      skills: [],
      tools: [],
    },
    {
      id: "report",
      title: "Write the report",
      action: "generate-doc",
      agent: "writer",
      model: "sonnet",
      instruction: "Draft a one-page markdown report of the findings.",
      skills: ["doc-authoring"],
      tools: [],
    },
    {
      id: "approve",
      title: "Approve",
      action: "approval",
      agent: "approver",
      model: "sonnet",
      skills: [],
      tools: [],
      gate: "human-approve",
    },
    { id: "notify", title: "Send", action: "notify", agent: "notifier", model: "haiku", skills: [], tools: [] },
    { id: "end", title: "End", action: "end", agent: "system", model: "haiku", skills: [], tools: [] },
  ],
  levers: ["routing", "caveman", "disclosure"],
  routing: { plan: "opus", exec: "sonnet" },
};

export function buildBuilderInstruction(packs: string[]): string {
  const actions = CORE_ACTIONS.map((a) => `- "${a.action}" (agent "${a.agent}"): ${a.purpose}`).join("\n");
  const levers = Object.entries(CORE_LEVERS)
    .map(([k, v]) => `- "${k}": ${v}`)
    .join("\n");
  return [
    "You are the VCC Workflow Architect. Turn a plain-language requirement into ONE automation workflow that follows this exact structure.",
    "",
    "A workflow is a JSON object:",
    '{ "name": kebab-case string, "pack": "custom", "inputs": {}, "stages": Stage[], "levers": string[], "routing": { "plan": "opus", "exec": "opus"|"sonnet"|"haiku" } }',
    "",
    'A Stage is: { "id": unique-kebab string, "title": short human title, "action": one of the actions below, "agent": the action\'s agent, "model": "opus"|"sonnet"|"haiku", "instruction": what this step does, "skills": string[], "tools": string[], "gate"?: "human-approve", "verify"?: "build"|"tests" }',
    "",
    "Rules:",
    "- Start with a \"start\" stage and end with an \"end\" stage.",
    "- Order stages logically; the runner executes them top to bottom.",
    "- Prefer haiku for simple steps, sonnet for reasoning, opus only when needed (routing keeps cost low).",
    "- Add an \"approval\" stage (gate: \"human-approve\") before any irreversible or outbound step.",
    "- Use only these actions:",
    actions,
    "",
    "Available token-saving levers (put the relevant ones in \"levers\"):",
    levers,
    "",
    `Skills you may attach to stages: ${CORE_SKILLS.join(", ")}.`,
    packs.length ? `Existing workflows you may call via a "subworkflow" stage (set instruction to the pack name): ${packs.join(", ")}.` : "",
    "",
    "Example workflow:",
    JSON.stringify(EXAMPLE),
    "",
    "Output ONLY the JSON workflow object — no prose, no explanation, no markdown code fences.",
  ]
    .filter(Boolean)
    .join("\n");
}
