import type { DesignKind } from "@vcc-workflow/schema";

export interface KindMeta {
  label: string;
  color: string;
  hint: string;
  starters: string[];
}

export const KIND_META: Record<DesignKind, KindMeta> = {
  mockup: {
    label: "Mockup",
    color: "#E8734A",
    hint: "Describe the screen. I'll design a hi-fi HTML mockup you can preview and refine.",
    starters: [
      "A SaaS landing page: nav, hero with CTA, three feature cards, pricing, footer.",
      "A dashboard with a sidebar, top stats row, and a data table.",
    ],
  },
  wireframe: {
    label: "Wireframe",
    color: "#55565e",
    hint: "Describe the layout. I'll draw a low-fi greyscale wireframe of the structure.",
    starters: [
      "Wireframe a mobile checkout: cart summary, address, payment, confirm.",
      "Wireframe a settings page with a left menu and a form on the right.",
    ],
  },
  flow: {
    label: "Flow",
    color: "#1E8657",
    hint: "Describe the journey. I'll map the screen-to-screen user flow as a diagram.",
    starters: [
      "User flow for sign-up with email verification and onboarding.",
      "Checkout flow including a failed-payment branch.",
    ],
  },
  "design-system": {
    label: "Design system",
    color: "#5b3a8a",
    hint: "Describe the brand. I'll generate a style guide — tokens, type, and components.",
    starters: [
      "A warm, minimal design system: colors, type scale, buttons, inputs, cards.",
      "A dark, high-contrast design system for a developer tool.",
    ],
  },
  diagram: {
    label: "Diagram",
    color: "#2A6DAC",
    hint: "Describe what to diagram. I'll render it as a Mermaid diagram.",
    starters: ["Diagram the sign-up flow.", "Draw the high-level architecture."],
  },
};

export const CREATABLE: DesignKind[] = ["mockup", "wireframe", "flow", "design-system", "diagram"];
