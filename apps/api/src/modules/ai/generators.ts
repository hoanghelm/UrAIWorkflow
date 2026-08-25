import { workflowSchema, planStepSchema, type PlanStep } from "@vcc-workflow/schema";
import { agentByName } from "../catalog/builtin-blocks";
import { buildBuilderInstruction } from "../workflow/builder-knowledge";
import { TEST_GENERATORS } from "./test-generators";

export interface GeneratorDeps {
  packs: string[];
}

export interface Generator {
  kind: string;
  label: string;
  agent: string;
  action: string;
  model: "opus" | "sonnet" | "haiku";
  persona?: string;
  needsPacks?: boolean;
  instruction: (input: { requirement: string; context: string }, deps: GeneratorDeps) => string;
  parse: (text: string) => { artifact: unknown; summary: string } | null;
}

function sliceJson(text: string, open: "{" | "["): string | null {
  const close = open === "{" ? "}" : "]";
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = stripped.indexOf(open);
  const end = stripped.lastIndexOf(close);
  if (start === -1 || end === -1) {
    return null;
  }
  return stripped.slice(start, end + 1);
}

function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:mermaid)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function stripHtml(text: string): string {
  return text
    .trim()
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

const MOCKUP_INSTRUCTION = [
  "Produce a single, self-contained HTML mockup — a hi-fi UI screen — that satisfies the requirement, informed by the context.",
  "Rules:",
  "- Output ONE complete HTML document beginning with <!doctype html>, with ALL CSS inline in a <style> tag.",
  "- No external files, no CDN links, no <link> to fonts, no external images. Use font-family stacks and inline SVG or CSS for any graphics.",
  "- Avoid <script> unless truly essential to demonstrate the screen.",
  "- Make it visually polished and realistic: real layout, spacing, typography, color, buttons, states, and believable placeholder content.",
  "- Responsive and clean; use semantic HTML.",
  "- If a current design is provided in the context, MODIFY it to satisfy the requirement instead of starting from scratch.",
  "Output ONLY the HTML document — no prose, no explanation, no markdown code fences.",
].join("\n");

const htmlParse = (summary: string) => (text: string) => {
  const html = stripHtml(text);
  if (!html || !/</.test(html)) return null;
  return { artifact: { html, model: "opus" }, summary };
};

const mockup: Generator = {
  kind: "mockup",
  label: "AI Builder — Mockup",
  agent: "designer",
  action: "design",
  model: "opus",
  persona: agentByName["designer"]?.system,
  instruction: () => MOCKUP_INSTRUCTION,
  parse: htmlParse("Updated the mockup — see the preview."),
};

const WIREFRAME_INSTRUCTION = [
  "Produce a single, self-contained LOW-FIDELITY HTML wireframe for the requirement, informed by the context.",
  "Rules:",
  "- Output ONE complete HTML document beginning with <!doctype html>, all CSS inline in a <style> tag.",
  "- Wireframe style ONLY: greyscale (whites, greys, #999 borders), no brand color, no photographs.",
  "- Represent images/avatars as grey boxes with a diagonal cross or the label 'image'. Use grey bars or short labels for text.",
  "- Show structure and layout, not visual polish: boxes, sections, nav, and buttons drawn as outlined rectangles.",
  "- Simple sans-serif font stack. Responsive, semantic HTML. No <script>, no external resources.",
  "- If a current wireframe is provided in the context, MODIFY it to satisfy the requirement.",
  "Output ONLY the HTML document — no prose, no explanation, no markdown code fences.",
].join("\n");

const wireframe: Generator = {
  kind: "wireframe",
  label: "AI Builder — Wireframe",
  agent: "prototyper",
  action: "design",
  model: "opus",
  persona: agentByName["prototyper"]?.system,
  instruction: () => WIREFRAME_INSTRUCTION,
  parse: htmlParse("Updated the wireframe — see the preview."),
};

const FLOW_INSTRUCTION = [
  "Produce a single Mermaid diagram representing the USER FLOW — the screen-to-screen journey — for the requirement.",
  "- Use a flowchart (flowchart TD or LR).",
  "- Each node is a screen or a decision; edges are user actions, labelled, e.g.  A -->|taps Sign up| B .",
  "- Rounded nodes for screens: id([Screen name]). Diamond nodes for decisions: id{Question?}.",
  "- Keep labels short. Cover the happy path and at least one branch.",
  "Output ONLY valid Mermaid source — no prose, no explanation, no markdown code fences.",
].join("\n");

const flow: Generator = {
  kind: "flow",
  label: "AI Builder — Flow",
  agent: "renderer",
  action: "diagram",
  model: "opus",
  persona: agentByName["renderer"]?.system,
  instruction: () => FLOW_INSTRUCTION,
  parse: (text) => {
    const mermaid = stripFences(text) || DIAGRAM_FALLBACK;
    return { artifact: { mermaid, model: "opus" }, summary: "Updated the flow — see the preview." };
  },
};

const DESIGN_SYSTEM_INSTRUCTION = [
  "Produce a single, self-contained HTML STYLE GUIDE / design system for the requirement, informed by the context.",
  "Render these sections, each clearly labelled:",
  "- Color palette: swatches with the hex value under each.",
  "- Typography scale: headings, body, and caption samples with their sizes.",
  "- Spacing scale: labelled spacing blocks.",
  "- Core components: buttons (default/hover/disabled), inputs, badges, and a card.",
  "Rules:",
  "- ONE complete HTML document beginning with <!doctype html>, all CSS inline in a <style> tag.",
  "- Define design tokens as CSS variables in :root and USE them throughout the components.",
  "- No external resources. Semantic HTML, clean layout.",
  "- If a current design system is provided in the context, MODIFY it to satisfy the requirement.",
  "Output ONLY the HTML document — no prose, no explanation, no markdown code fences.",
].join("\n");

const designSystem: Generator = {
  kind: "design-system",
  label: "AI Builder — Design system",
  agent: "designer",
  action: "design",
  model: "opus",
  persona: agentByName["designer"]?.system,
  instruction: () => DESIGN_SYSTEM_INSTRUCTION,
  parse: htmlParse("Updated the design system — see the preview."),
};

const DIAGRAM_FALLBACK = `flowchart TB
  N["Activate a Claude connector to generate diagrams from AI.\\nNo active model — showing a placeholder."]`;

const workflow: Generator = {
  kind: "workflow",
  label: "AI Builder — Workflow",
  agent: "workflow-architect",
  action: "build",
  model: "opus",
  persona: agentByName["workflow-architect"]?.system,
  needsPacks: true,
  instruction: (_input, deps) => buildBuilderInstruction(deps.packs),
  parse: (text) => {
    const json = sliceJson(text, "{");
    if (!json) return null;
    try {
      const obj = JSON.parse(json) as Record<string, unknown>;
      if (!Array.isArray(obj.stages) || obj.stages.length === 0) return null;
      const wf = workflowSchema.parse({ ...obj, pack: "custom" });
      const summary =
        `Built **${wf.name}** — ${wf.stages.length} step${wf.stages.length === 1 ? "" : "s"}:\n\n` +
        wf.stages.map((s, i) => `${i + 1}. ${s.title || s.id}${s.gate ? " · approval" : ""}`).join("\n");
      return { artifact: wf, summary };
    } catch {
      return null;
    }
  },
};

const AWS_ICONS =
  "lambda, s3, api-gateway, dynamodb, ec2, ecs, eks, fargate, rds, aurora, cognito, cloudfront, " +
  "route53, vpc, sns, sqs, eventbridge, step-functions, cloudwatch, kinesis, redshift, glue, " +
  "secrets-manager, kms, iam, elb, elasticache, cloudformation, codepipeline, codebuild, cloudtrail, athena, appsync, amplify";

const DIAGRAM_INSTRUCTION = [
  "Produce a single Mermaid diagram that satisfies the requirement, informed by the context.",
  "Choose the diagram type by what fits best:",
  "- For a CLOUD or SYSTEM ARCHITECTURE (services, accounts, infrastructure), use Mermaid `architecture-beta` with icons.",
  "- Otherwise use the simplest fitting type (flowchart, sequenceDiagram, C4, erDiagram, etc.).",
  "",
  "architecture-beta rules:",
  '- First line is exactly "architecture-beta".',
  "- Group accounts/boundaries with:  group id(icon)[Title]   and nest with:  group id(icon)[Title] in parentId",
  "- Add services with:  service id(icon)[Label] in groupId",
  "- Connect with edges:  sourceId:SIDE --> SIDE:targetId   where SIDE is one of T,B,L,R; arrows may be -- , --> , <-- , <-->.",
  "- Use  junction jid in groupId  to fan one source out to several targets.",
  "",
  "Icons — use ONLY names from this catalog, or Mermaid will fail:",
  `- AWS services (write as logos:aws-NAME): ${AWS_ICONS}.`,
  "- Cloud account/group icons: logos:aws , logos:google-cloud , logos:microsoft-azure.",
  "- GCP services: logos:google-cloud-functions , logos:google-cloud-run (else use a generic icon below).",
  "- Azure services: use logos:microsoft-azure or a generic icon below.",
  "- Generic built-in icons (no prefix), for anything without a specific logo: cloud, database, disk, internet, server.",
  "Never invent icon names. If unsure, use a generic icon.",
  "",
  "Example:",
  "architecture-beta",
  "  group aws(logos:aws)[AWS Account]",
  "  service cdn(logos:aws-cloudfront)[CloudFront] in aws",
  "  service api(logos:aws-api-gateway)[API Gateway] in aws",
  "  service fn(logos:aws-lambda)[Lambda] in aws",
  "  service db(logos:aws-dynamodb)[DynamoDB] in aws",
  "  cdn:R --> L:api",
  "  api:R --> L:fn",
  "  fn:R --> L:db",
  "",
  "Output ONLY valid Mermaid source — no prose, no explanation, no markdown code fences.",
].join("\n");

const diagram: Generator = {
  kind: "diagram",
  label: "AI Builder — Diagram",
  agent: "renderer",
  action: "diagram",
  model: "opus",
  persona: agentByName["renderer"]?.system,
  instruction: () => DIAGRAM_INSTRUCTION,
  parse: (text) => {
    const mermaid = stripFences(text) || DIAGRAM_FALLBACK;
    return { artifact: { mermaid, model: "opus" }, summary: "Updated the diagram — see the preview." };
  },
};

const plan: Generator = {
  kind: "plan",
  label: "AI Builder — Plan",
  agent: "planner",
  action: "plan",
  model: "opus",
  persona: agentByName["planner"]?.system,
  instruction: ({ requirement, context }) =>
    "Turn the goal into a short, ordered plan the user can act on. " +
    'Output ONLY a JSON array; each element {"title": string, "detail": string}. ' +
    "Between 3 and 10 items. No prose, no markdown code fences.\n" +
    `Goal: ${requirement}` +
    (context ? `\nContext: ${context}` : ""),
  parse: (text) => {
    const json = sliceJson(text, "[");
    if (!json) return null;
    try {
      const raw = JSON.parse(json) as unknown[];
      const items = raw
        .map((r) => planStepSchema.safeParse(r))
        .filter((r): r is { success: true; data: PlanStep } => r.success)
        .map((r) => r.data);
      if (items.length === 0) return null;
      const summary =
        `Planned ${items.length} step${items.length === 1 ? "" : "s"}:\n\n` +
        items.map((it, i) => `${i + 1}. ${it.title}`).join("\n");
      return { artifact: { items }, summary };
    } catch {
      return null;
    }
  },
};

export const GENERATORS: Record<string, Generator> = {
  workflow,
  diagram,
  plan,
  mockup,
  wireframe,
  flow,
  "design-system": designSystem,
  ...TEST_GENERATORS,
};
