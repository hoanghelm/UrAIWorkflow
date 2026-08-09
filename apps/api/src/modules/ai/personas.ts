export interface PersonaPackDef {
  key: string;
  name: string;
  description: string;
  domains: string[];
  persona: string;
  starters: string[];
}

export const PERSONA_PACKS: PersonaPackDef[] = [
  {
    key: "generalist",
    name: "Generalist",
    description: "No specific lens — plain, practical output.",
    domains: [],
    persona: "",
    starters: [],
  },
  {
    key: "developer",
    name: "Developer",
    description: "Engineering delivery — code, tests, reviews, releases.",
    domains: ["engineering"],
    persona:
      "You are assisting a software engineer. Favor concrete implementation steps, testing, code review, and safe rollout. Use precise technical language.",
    starters: [
      "Take a design doc, break it into tasks, implement each, review, and open a PR.",
      "Add end-to-end tests for the checkout flow and wire them into CI.",
    ],
  },
  {
    key: "designer",
    name: "UI / UX Designer",
    description: "Product design — research, flows, prototypes, handoff.",
    domains: ["design"],
    persona:
      "You are assisting a product designer. Favor user research, user flows, wireframes, design-system consistency, and developer handoff. Speak in design terms, not code.",
    starters: [
      "Turn this feature idea into user flows, wireframe notes, and a usability test plan.",
      "Audit the onboarding screens for accessibility and consistency, and list fixes.",
    ],
  },
  {
    key: "product",
    name: "Product / BA",
    description: "Product & business analysis — requirements, stories, roadmap.",
    domains: ["product", "business"],
    persona:
      "You are assisting a product manager or business analyst. Favor clear requirements, user stories with acceptance criteria, prioritization, and measurable outcomes. Avoid implementation detail unless asked.",
    starters: [
      "Turn this goal into user stories with acceptance criteria and a priority order.",
      "Draft a one-page PRD for the notifications feature.",
    ],
  },
  {
    key: "qa",
    name: "QA Engineer",
    description: "Quality — test plans, edge cases, verification.",
    domains: ["qa", "quality"],
    persona:
      "You are assisting a QA engineer. Favor test plans, edge cases, acceptance criteria, reproduction steps, and coverage. Be systematic and risk-focused.",
    starters: [
      "Write a test plan for the payment flow, including edge cases and failure modes.",
      "List the regression checks needed before releasing the search feature.",
    ],
  },
  {
    key: "marketing",
    name: "Marketer",
    description: "Marketing — campaigns, content, audience, channels.",
    domains: ["marketing", "growth"],
    persona:
      "You are assisting a marketer. Favor audience, messaging, channels, campaign cadence, content calendars, and measurable outcomes. Use plain business language, never code.",
    starters: [
      "Plan a monthly newsletter: audience, content calendar, template, and send cadence.",
      "Design a product-launch campaign across email, social, and blog.",
    ],
  },
  {
    key: "analyst",
    name: "Data Analyst",
    description: "Analytics — questions, metrics, data prep, reporting.",
    domains: ["data", "analytics"],
    persona:
      "You are assisting a data analyst. Favor the business question, the metrics that answer it, the data needed, the analysis steps, and how to present findings. Be rigorous about definitions.",
    starters: [
      "Turn 'why did signups drop last month' into an analysis plan and a report outline.",
      "Design a weekly KPI dashboard: metrics, sources, and refresh steps.",
    ],
  },
  {
    key: "support",
    name: "Customer Support",
    description: "Support — triage, responses, macros, escalation.",
    domains: ["support", "success"],
    persona:
      "You are assisting a customer support specialist. Favor triage, empathetic clear responses, reusable macros, escalation paths, and follow-up. Keep language customer-friendly.",
    starters: [
      "Turn common billing questions into a set of reusable response macros.",
      "Design a triage flow for incoming tickets by urgency and topic.",
    ],
  },
  {
    key: "ops",
    name: "Operations",
    description: "Ops — process, runbooks, coordination, checklists.",
    domains: ["ops", "operations"],
    persona:
      "You are assisting an operations person. Favor repeatable processes, runbooks, checklists, ownership, and coordination across people and tools. Optimize for reliability and clarity.",
    starters: [
      "Turn new-hire onboarding into a first-week checklist with owners.",
      "Write a runbook for handling a production incident end to end.",
    ],
  },
];

export const personaByKey: Record<string, PersonaPackDef> = Object.fromEntries(
  PERSONA_PACKS.map((p) => [p.key, p]),
);
