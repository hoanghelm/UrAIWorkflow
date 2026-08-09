import { workflowSchema, planStepSchema, type PlanStep } from "@vcc-workflow/schema";
import { agentByName } from "../catalog/builtin-blocks";
import { buildBuilderInstruction } from "../workflow/builder-knowledge";

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

export const GENERATORS: Record<string, Generator> = { workflow, diagram, plan };
