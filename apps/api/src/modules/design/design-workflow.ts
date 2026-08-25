import type { DesignKind } from "@vcc-workflow/schema";
import { agentByName, skillByName } from "../catalog/builtin-blocks";

export interface DesignWorkflowStep {
  name: string;
  detail: string;
}

export interface DesignWorkflow {
  kind: DesignKind;
  label: string;
  agent: string;
  model: "opus" | "sonnet" | "haiku";
  steps: DesignWorkflowStep[];
  skills: string[];
  rules: string[];
  commands: string[];
}

const COMMON_RULES = [
  "Establish one clear visual hierarchy per view — a single primary action, a consistent heading scale.",
  "Use an 8px spacing system and a limited, consistent type scale.",
  "Keep a restrained, intentional palette; ensure text/background contrast meets WCAG AA.",
  "Align everything to a grid; keep consistent alignment and generous whitespace.",
  "Write real, believable content and labels — avoid lorem where a real label fits.",
];

export const DESIGN_WORKFLOWS: Record<DesignKind, DesignWorkflow> = {
  mockup: {
    kind: "mockup",
    label: "Hi-fi mockup",
    agent: "designer",
    model: "opus",
    steps: [
      { name: "Understand", detail: "Restate the goal, audience, and the key content and actions for the screen." },
      { name: "Information architecture", detail: "Decide layout regions, hierarchy, and the component breakdown." },
      { name: "Visual design", detail: "Apply the design system — type scale, colour, spacing, and states — into polished HTML/CSS." },
      { name: "Self-review", detail: "Check hierarchy, contrast, spacing consistency, and responsiveness before finishing." },
    ],
    skills: ["design-tokens", "accessibility"],
    rules: COMMON_RULES,
    commands: ["/refine", "/responsive"],
  },
  wireframe: {
    kind: "wireframe",
    label: "Low-fi wireframe",
    agent: "prototyper",
    model: "opus",
    steps: [
      { name: "Understand", detail: "Restate the screen's purpose and the essential content blocks." },
      { name: "Structure", detail: "Lay out regions and grouping with greyscale boxes — structure over polish." },
      { name: "Annotate", detail: "Label placeholders (image, avatar, text) and primary actions clearly." },
    ],
    skills: ["accessibility"],
    rules: [
      "Greyscale only — no brand colour, no real imagery; represent media as labelled grey boxes.",
      "Show structure, grouping and hierarchy, not visual polish.",
      ...COMMON_RULES.slice(3),
    ],
    commands: ["/add-section", "/annotate"],
  },
  flow: {
    kind: "flow",
    label: "User flow",
    agent: "renderer",
    model: "opus",
    steps: [
      { name: "Map screens", detail: "List each screen/state as a node in the journey." },
      { name: "Connect actions", detail: "Draw labelled edges for the user actions between screens." },
      { name: "Branches", detail: "Add decision points and at least one non-happy-path branch." },
    ],
    skills: ["mermaid-authoring"],
    rules: [
      "Use a Mermaid flowchart; rounded nodes for screens, diamonds for decisions.",
      "Label every edge with the user action that triggers it.",
      "Cover the happy path plus a meaningful branch (error, empty, or alternative).",
    ],
    commands: ["/add-branch"],
  },
  "design-system": {
    kind: "design-system",
    label: "Design system",
    agent: "designer",
    model: "opus",
    steps: [
      { name: "Tokens", detail: "Define colour and spacing tokens as CSS variables in :root." },
      { name: "Type & scale", detail: "Set a type scale and use the tokens throughout." },
      { name: "Components", detail: "Show buttons (states), inputs, badges and a card, all built from the tokens." },
    ],
    skills: ["design-tokens", "accessibility"],
    rules: [
      "Every component must consume the CSS-variable tokens — no hard-coded values.",
      "Label each section (palette, type, spacing, components) with the token values shown.",
      ...COMMON_RULES.slice(2),
    ],
    commands: ["/add-component", "/theme"],
  },
  diagram: {
    kind: "diagram",
    label: "Diagram",
    agent: "renderer",
    model: "opus",
    steps: [
      { name: "Understand", detail: "Restate what must be conveyed and the relationships involved." },
      { name: "Choose type", detail: "Pick the Mermaid type that fits best (flowchart, sequence, ER, architecture)." },
      { name: "Render", detail: "Produce clean, valid Mermaid with clear labels." },
    ],
    skills: ["mermaid-authoring"],
    rules: [
      "Pick the simplest Mermaid type that fits; keep labels short and unambiguous.",
      "Group related nodes; avoid crossing edges where possible.",
    ],
    commands: [],
  },
};

export function buildDesignGuidance(kind: DesignKind): string {
  const wf = DESIGN_WORKFLOWS[kind];
  const steps = wf.steps.map((s, i) => `${i + 1}. ${s.name} — ${s.detail}`).join("\n");
  const rules = wf.rules.map((r) => `- ${r}`).join("\n");
  const skillGuidance = wf.skills
    .map((s) => skillByName[s]?.guidance)
    .filter(Boolean)
    .join("\n");
  return [
    "Follow this design workflow before producing the artifact. Reason through each step internally; output only the final artifact.",
    steps,
    `Design rules:\n${rules}`,
    skillGuidance ? `Applied skills:\n${skillGuidance}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export interface DesignWorkflowView {
  kind: DesignKind;
  label: string;
  agent: string;
  agentTitle: string;
  model: string;
  steps: DesignWorkflowStep[];
  skills: { name: string; title: string }[];
  rules: string[];
  commands: string[];
}

export function designWorkflowViews(): DesignWorkflowView[] {
  return Object.values(DESIGN_WORKFLOWS).map((wf) => ({
    kind: wf.kind,
    label: wf.label,
    agent: wf.agent,
    agentTitle: agentByName[wf.agent]?.title ?? wf.agent,
    model: wf.model,
    steps: wf.steps,
    skills: wf.skills.map((s) => ({ name: s, title: skillByName[s]?.title ?? s })),
    rules: wf.rules,
    commands: wf.commands,
  }));
}
