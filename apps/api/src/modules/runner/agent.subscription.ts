import { Injectable } from "@nestjs/common";
import type { StageRequest, StageResult } from "./agent.port";
import type { ActiveConnector } from "../connectors/connectors.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RunnerGateway } from "./runner.gateway";

const FLUSH_EVERY_CHARS = 300;

type Tier = "opus" | "sonnet" | "haiku";

interface AgentQueryOptions {
  model?: string;
  systemPrompt?: string | { type: "preset"; preset: "claude_code"; append?: string };
  settingSources?: string[];
  allowedTools?: string[];
  permissionMode?: string;
  includePartialMessages?: boolean;
  cwd?: string;
  mcpServers?: Record<string, unknown>;
  additionalDirectories?: string[];
  abortController?: AbortController;
}

interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  name?: string;
  input?: unknown;
  content?: unknown;
}

interface AgentMessage {
  type: string;
  message?: { content?: ContentBlock[]; usage?: Record<string, number> };
  event?: { type?: string; delta?: { type?: string; text?: string } };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  total_cost_usd?: number;
}

type QueryFn = (args: {
  prompt: string;
  options?: AgentQueryOptions;
}) => AsyncIterable<AgentMessage>;

const loadQuery = new Function(
  "return import('@anthropic-ai/claude-agent-sdk')",
) as () => Promise<{ query: QueryFn }>;

const LEVER_DIRECTIVE: Record<string, string> = {
  caveman: "Write in telegraphic style — drop filler words, keep code and errors exact.",
  ponytail: "Produce the minimum code that works; reuse existing code before writing new.",
  disclosure: "Only use context this step actually needs; do not restate background.",
};

@Injectable()
export class ClaudeSubscriptionAdapter {
  constructor(
    private readonly gateway: RunnerGateway,
    private readonly prisma: PrismaService,
  ) {}

  private async flush(runId: string, stageId: string, text: string): Promise<void> {
    await this.prisma.stageLog.upsert({
      where: { runId_stageId: { runId, stageId } },
      create: { runId, stageId, text, tokens: 0 },
      update: { text },
    });
  }

  async run(request: StageRequest, connector: ActiveConnector): Promise<StageResult> {
    const model = connector.models[request.model as Tier] ?? request.model;
    const { query } = await loadQuery();

    const directives = request.levers
      .map((l) => LEVER_DIRECTIVE[l])
      .filter(Boolean)
      .join(" ");
    const base =
      request.persona ??
      `You are the "${request.agent}" step in a workflow. Action type: ${request.action}. Be terse. Return only the result for this step.`;
    const framing = [base, request.guidance, directives].filter(Boolean).join(" ");
    const prompt =
      (request.context ? `Context from earlier steps (reuse it; do not redo their work):\n${request.context}\n\n` : "") +
      `Step: ${request.title || request.stageId}\n` +
      `Instruction: ${request.instruction || "(follow the action type)"}\n` +
      `Inputs: ${JSON.stringify(request.input)}\n` +
      `Produce the concrete output for this step.`;

    const harness = Boolean(request.harness && request.cwd);
    const boundary = harness
      ? `\n\nHARD BOUNDARY: your project root is "${request.cwd}". Treat it as the entire project. ` +
        `Only read, write, edit or run commands on paths inside this root. Never touch any path outside it, ` +
        `and never use absolute paths that leave it. If a parent directory above the root contains its own ` +
        `CLAUDE.md, .claude, or looks like a different project, ignore it — it is not yours. All new files go ` +
        `under this root.`
      : "";
    const options: AgentQueryOptions = harness
      ? {
          model,
          systemPrompt: { type: "preset", preset: "claude_code", append: framing + boundary },
          settingSources: ["project", "local"],
          permissionMode: "bypassPermissions",
          includePartialMessages: true,
          cwd: request.cwd,
          additionalDirectories: [],
          ...(request.abortController ? { abortController: request.abortController } : {}),
          ...(request.mcpServers ? { mcpServers: request.mcpServers } : {}),
        }
      : {
          model,
          systemPrompt: framing,
          allowedTools: [],
          permissionMode: "bypassPermissions",
          includePartialMessages: true,
          ...(request.abortController ? { abortController: request.abortController } : {}),
        };

    let text = "";
    let assembled = "";
    let trace = "";
    let input = 0;
    let output = 0;
    let cached = 0;
    let flushedLen = 0;

    const addTrace = (line: string): void => {
      trace += `${line}\n`;
      this.gateway.emitTrace({
        runId: request.runId,
        stageId: request.stageId,
        text: `${line}\n`,
      });
    };

    let aborted = false;
    try {
      for await (const message of query({ prompt, options })) {
        if (options.abortController?.signal.aborted) {
          aborted = true;
          break;
        }
        if (message.type === "stream_event" && message.event?.delta?.type === "text_delta") {
        const delta = message.event.delta.text ?? "";
        text += delta;
        this.gateway.emitDelta({ runId: request.runId, stageId: request.stageId, text: delta });
        if (text.length - flushedLen >= FLUSH_EVERY_CHARS) {
          flushedLen = text.length;
          void this.flush(request.runId, request.stageId, text);
        }
      } else if (message.type === "assistant") {
        for (const block of message.message?.content ?? []) {
          if (block.type === "text") {
            assembled += block.text ?? "";
          } else if (block.type === "thinking" && block.thinking) {
            addTrace(`thinking · ${summarize(block.thinking, 600)}`);
          } else if (block.type === "tool_use") {
            addTrace(`call · ${block.name ?? "tool"} ${summarizeInput(block.input)}`);
          }
        }
      } else if (message.type === "user") {
        for (const block of message.message?.content ?? []) {
          if (block.type === "tool_result") {
            addTrace(`  result · ${summarizeResult(block.content)}`);
          }
        }
      } else if (message.type === "result") {
        const usage = message.usage ?? {};
        input = usage.input_tokens ?? 0;
        output = usage.output_tokens ?? 0;
        cached = usage.cache_read_input_tokens ?? 0;
      }
      }
    } catch (err) {
      if (options.abortController?.signal.aborted) {
        aborted = true;
      } else {
        throw err;
      }
    }

    const final = text || assembled;
    await this.flush(request.runId, request.stageId, final);

    return {
      output: { stageId: request.stageId, model, text: final },
      tokensConsumed: input + output,
      tokensInput: input,
      tokensOutput: output,
      tokensCached: cached,
      toolSavings: [],
      savings: [],
      verifierPassed: true,
      trace,
      aborted,
    };
  }
}

function summarize(value: string, max: number): string {
  const s = value.replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function summarizeInput(input: unknown): string {
  if (input && typeof input === "object") {
    const o = input as Record<string, unknown>;
    const key = o.file_path ?? o.path ?? o.command ?? o.pattern ?? o.url ?? o.query ?? o.prompt;
    if (typeof key === "string") {
      return summarize(key, 200);
    }
    return summarize(JSON.stringify(o), 200);
  }
  return summarize(String(input ?? ""), 200);
}

function summarizeResult(content: unknown): string {
  let s = "";
  if (Array.isArray(content)) {
    s = content
      .map((c) =>
        typeof c === "string" ? c : ((c as { text?: string })?.text ?? JSON.stringify(c)),
      )
      .join(" ");
  } else if (typeof content === "string") {
    s = content;
  } else {
    s = JSON.stringify(content ?? "");
  }
  return summarize(s, 400);
}
