import type { Generator } from "./generators";
import { agentByName } from "../catalog/builtin-blocks";

function stripCode(text: string): string {
  return text
    .trim()
    .replace(/^```[a-zA-Z0-9._-]*\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

const codeParse = (summary: string) => (text: string) => {
  const code = stripCode(text);
  if (!code) return null;
  return { artifact: { code, model: "opus" }, summary };
};

const DETECT =
  "First detect THIS project's language, test framework and conventions from its files (package.json / pyproject / go.mod, existing *.test.* / *.spec.* files, and jest/vitest/pytest/playwright config) and MATCH them exactly — same framework, imports, file naming and assertion style.";

const unit: Generator = {
  kind: "unit",
  label: "AI Builder — Unit tests",
  agent: "tester",
  action: "test",
  model: "opus",
  persona: agentByName["tester"]?.system,
  instruction: () =>
    [
      "Write focused UNIT tests for the target described in the requirement.",
      DETECT,
      "Cover the key behaviours, edge cases and error paths. Keep each test isolated — mock or stub external dependencies (network, DB, time).",
      "Start with a one-line comment naming the file path to create. Output ONLY the test file's code — no prose, no markdown fences.",
    ].join("\n"),
  parse: codeParse("Generated unit tests."),
};

const integration: Generator = {
  kind: "integration",
  label: "AI Builder — Integration tests",
  agent: "tester",
  action: "test",
  model: "opus",
  persona: agentByName["tester"]?.system,
  instruction: () =>
    [
      "Write INTEGRATION tests that exercise several units/modules together (e.g. service + repository + DB, or API route + handler).",
      DETECT,
      "Use the project's real wiring where practical; set up and tear down shared state. Cover the main flow plus at least one failure path.",
      "Start with a one-line comment naming the file path to create. Output ONLY the test file's code — no prose, no markdown fences.",
    ].join("\n"),
  parse: codeParse("Generated integration tests."),
};

const e2e: Generator = {
  kind: "e2e",
  label: "AI Builder — E2E / automation",
  agent: "tester",
  action: "test",
  model: "opus",
  persona: agentByName["tester"]?.system,
  instruction: () =>
    [
      "Write an END-TO-END / browser automation test for the user flow described in the requirement.",
      "Prefer Playwright unless the project already uses Cypress or another runner — detect this from the project and MATCH it.",
      "Drive the app as a user would: navigation, form input, assertions on visible outcomes. Use resilient selectors (roles/labels/test-ids), not brittle CSS. Include setup and cleanup.",
      "Start with a one-line comment naming the file path to create. Output ONLY the test file's code — no prose, no markdown fences.",
    ].join("\n"),
  parse: codeParse("Generated E2E test."),
};

const api: Generator = {
  kind: "api",
  label: "AI Builder — API tests",
  agent: "tester",
  action: "test",
  model: "opus",
  persona: agentByName["tester"]?.system,
  instruction: () =>
    [
      "Write API / HTTP endpoint tests for the endpoint(s) described in the requirement.",
      DETECT,
      "Cover success responses, validation/4xx errors, auth where relevant, and edge cases. Assert status codes, response shape and side effects.",
      "Start with a one-line comment naming the file path to create. Output ONLY the test file's code — no prose, no markdown fences.",
    ].join("\n"),
  parse: codeParse("Generated API tests."),
};

const testPlan: Generator = {
  kind: "test-plan",
  label: "AI Builder — Test plan",
  agent: "analyst",
  action: "plan",
  model: "opus",
  persona: agentByName["analyst"]?.system,
  instruction: () =>
    [
      "Produce a QA TEST PLAN for the requirement as Markdown.",
      "Include: a short Scope, Preconditions, and a set of Test Cases. For each case give an ID, a title, the steps as Given / When / Then, and the Expected result.",
      "Cover the happy path, edge cases, and negative/error cases. Group related cases under headings.",
      "Output ONLY Markdown — do not wrap the whole document in a code fence.",
    ].join("\n"),
  parse: (text) => {
    const md = text.trim();
    if (!md) return null;
    return { artifact: { markdown: md }, summary: "Generated test plan." };
  },
};

export const TEST_GENERATORS: Record<string, Generator> = {
  unit,
  integration,
  e2e,
  api,
  "test-plan": testPlan,
};
