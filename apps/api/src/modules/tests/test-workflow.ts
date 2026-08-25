import { agentByName, skillByName } from "../catalog/builtin-blocks";

export type TestKind = "unit" | "integration" | "e2e" | "api" | "test-plan";

export interface TestWorkflowStep {
  name: string;
  detail: string;
}

export interface TestWorkflow {
  kind: TestKind;
  label: string;
  agent: string;
  model: "opus" | "sonnet" | "haiku";
  format: "code" | "markdown";
  steps: TestWorkflowStep[];
  skills: string[];
  rules: string[];
  commands: string[];
}

const COMMON_RULES = [
  "Detect and match the project's existing test framework, imports, file naming and assertion style exactly.",
  "Make tests deterministic — no real network, time or randomness; mock or stub external dependencies.",
  "Name each test by the behaviour it checks; keep one clear assertion focus per test.",
  "Cover the happy path, edge cases, and error/negative cases.",
];

export const TEST_WORKFLOWS: Record<TestKind, TestWorkflow> = {
  unit: {
    kind: "unit",
    label: "Unit tests",
    agent: "tester",
    model: "opus",
    format: "code",
    steps: [
      { name: "Understand target", detail: "Identify the unit under test and its inputs, outputs and dependencies." },
      { name: "Enumerate cases", detail: "List the behaviours, boundaries and error paths worth asserting." },
      { name: "Write tests", detail: "Write isolated tests with the project's framework; stub external dependencies." },
      { name: "Self-check", detail: "Ensure each case is deterministic and asserts a single clear behaviour." },
    ],
    skills: ["code-review"],
    rules: COMMON_RULES,
    commands: ["/add-edge-cases", "/mock"],
  },
  integration: {
    kind: "integration",
    label: "Integration tests",
    agent: "tester",
    model: "opus",
    format: "code",
    steps: [
      { name: "Map the seams", detail: "Identify the modules/services that interact and the contract between them." },
      { name: "Set up state", detail: "Arrange shared fixtures/data with proper setup and teardown." },
      { name: "Exercise flows", detail: "Drive the real wiring across the boundary for the main flow." },
      { name: "Failure paths", detail: "Add at least one failure/rollback path across the seam." },
    ],
    skills: ["code-review"],
    rules: COMMON_RULES,
    commands: ["/add-failure-path"],
  },
  e2e: {
    kind: "e2e",
    label: "E2E / automation",
    agent: "tester",
    model: "opus",
    format: "code",
    steps: [
      { name: "Map the journey", detail: "List the user steps for the flow from entry to outcome." },
      { name: "Choose selectors", detail: "Prefer roles/labels/test-ids over brittle CSS selectors." },
      { name: "Automate steps", detail: "Drive navigation and input with the project's runner (Playwright/Cypress)." },
      { name: "Assert outcomes", detail: "Assert on visible, user-observable results; add setup and cleanup." },
    ],
    skills: [],
    rules: [
      "Use resilient selectors (getByRole/label/test-id), never brittle CSS or nth-child chains.",
      "Assert on user-visible outcomes, not implementation details.",
      ...COMMON_RULES.slice(1),
    ],
    commands: ["/add-step", "/flaky-check"],
  },
  api: {
    kind: "api",
    label: "API tests",
    agent: "tester",
    model: "opus",
    format: "code",
    steps: [
      { name: "Enumerate endpoints", detail: "List the routes, methods, inputs and auth involved." },
      { name: "Cases per endpoint", detail: "Success, validation/4xx, auth, and edge cases for each." },
      { name: "Write requests", detail: "Issue requests with the project's HTTP test tooling." },
      { name: "Assert", detail: "Assert status codes, response shape, and any side effects." },
    ],
    skills: ["code-review"],
    rules: COMMON_RULES,
    commands: ["/add-auth-cases"],
  },
  "test-plan": {
    kind: "test-plan",
    label: "Test plan",
    agent: "analyst",
    model: "opus",
    format: "markdown",
    steps: [
      { name: "Scope", detail: "State what is and isn't covered, and the preconditions." },
      { name: "Enumerate cases", detail: "List test cases with IDs and titles across the feature." },
      { name: "Given / When / Then", detail: "Write each case's steps and expected result clearly." },
      { name: "Coverage check", detail: "Confirm happy path, edge and negative cases are all represented." },
    ],
    skills: ["spec-authoring"],
    rules: [
      "Each case has an ID, a title, Given/When/Then steps, and an expected result.",
      "Group related cases under headings; keep steps concrete and repeatable.",
      "Cover happy path, edge cases, and negative/error cases.",
    ],
    commands: ["/add-negative-cases"],
  },
};

export function buildTestGuidance(kind: TestKind): string {
  const wf = TEST_WORKFLOWS[kind];
  if (!wf) return "";
  const steps = wf.steps.map((s, i) => `${i + 1}. ${s.name} — ${s.detail}`).join("\n");
  const rules = wf.rules.map((r) => `- ${r}`).join("\n");
  const skillGuidance = wf.skills
    .map((s) => skillByName[s]?.guidance)
    .filter(Boolean)
    .join("\n");
  return [
    "Follow this QA workflow before producing the artifact. Reason through each step internally; output only the final artifact.",
    steps,
    `QA rules:\n${rules}`,
    skillGuidance ? `Applied skills:\n${skillGuidance}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export interface TestWorkflowView {
  kind: TestKind;
  label: string;
  agent: string;
  agentTitle: string;
  model: string;
  format: "code" | "markdown";
  steps: TestWorkflowStep[];
  skills: { name: string; title: string }[];
  rules: string[];
  commands: string[];
}

export function testWorkflowViews(): TestWorkflowView[] {
  return Object.values(TEST_WORKFLOWS).map((wf) => ({
    kind: wf.kind,
    label: wf.label,
    agent: wf.agent,
    agentTitle: agentByName[wf.agent]?.title ?? wf.agent,
    model: wf.model,
    format: wf.format,
    steps: wf.steps,
    skills: wf.skills.map((s) => ({ name: s, title: skillByName[s]?.title ?? s })),
    rules: wf.rules,
    commands: wf.commands,
  }));
}
