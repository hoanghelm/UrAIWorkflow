export type TestKind = "unit" | "integration" | "e2e" | "api" | "test-plan";

export interface TestKindMeta {
  label: string;
  color: string;
  format: "code" | "markdown";
  hint: string;
  starters: string[];
}

export const TEST_META: Record<TestKind, TestKindMeta> = {
  unit: {
    label: "Unit tests",
    color: "#2A6DAC",
    format: "code",
    hint: "Name the unit or file to test. I'll write isolated unit tests in your project's framework.",
    starters: [
      "Unit tests for the price calculator, including rounding and zero-quantity cases.",
      "Unit tests for the auth token helper — expiry, invalid signature, refresh.",
    ],
  },
  integration: {
    label: "Integration tests",
    color: "#1E8657",
    format: "code",
    hint: "Describe the modules/services to test together. I'll test the real wiring across the seam.",
    starters: [
      "Integration test: create-order service writes to the DB and emits an event.",
      "Integration test for the signup flow: controller → service → repository.",
    ],
  },
  e2e: {
    label: "E2E / automation",
    color: "#E8734A",
    format: "code",
    hint: "Describe the user flow. I'll write a browser automation test (Playwright/Cypress).",
    starters: [
      "E2E: user signs up, verifies email, and lands on the dashboard.",
      "E2E checkout flow including a declined-payment branch.",
    ],
  },
  api: {
    label: "API tests",
    color: "#5b3a8a",
    format: "code",
    hint: "Name the endpoint(s). I'll test success, validation, auth, and edge cases.",
    starters: [
      "API tests for POST /orders: success, missing fields, unauthorized.",
      "API tests for the /designs CRUD endpoints.",
    ],
  },
  "test-plan": {
    label: "Test plan",
    color: "#a76a06",
    format: "markdown",
    hint: "Describe the feature. I'll write a QA test plan with Given/When/Then test cases.",
    starters: [
      "Test plan for the checkout feature.",
      "Test plan for user authentication and password reset.",
    ],
  },
};

export const TEST_KINDS: TestKind[] = ["unit", "integration", "e2e", "api", "test-plan"];
