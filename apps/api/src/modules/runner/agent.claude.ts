import { Injectable } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import type { StageRequest, StageResult } from "./agent.port";
import type { ActiveConnector } from "../connectors/connectors.service";
import { RunnerGateway } from "./runner.gateway";

type Tier = "opus" | "sonnet" | "haiku";

const LEVER_DIRECTIVE: Record<string, string> = {
  caveman: "Write in telegraphic style — drop filler words, keep code and errors exact.",
  ponytail: "Produce the minimum code that works; reuse existing code before writing new.",
  disclosure: "Only use context this step actually needs; do not restate background.",
};

@Injectable()
export class ClaudeAgentAdapter {
  constructor(private readonly gateway: RunnerGateway) {}

  async run(request: StageRequest, connector: ActiveConnector): Promise<StageResult> {
    const model = connector.models[request.model as Tier] ?? request.model;
    const client = new Anthropic({ apiKey: connector.apiKey, baseURL: connector.baseUrl });

    const directives = request.levers
      .map((l) => LEVER_DIRECTIVE[l])
      .filter(Boolean)
      .join(" ");
    const base =
      request.persona ??
      `You are the "${request.agent}" step in a workflow. Action type: ${request.action}. Be terse. Return only the result for this step.`;
    const system = [base, request.guidance, directives].filter(Boolean).join(" ");
    const prompt =
      (request.context ? `Context from earlier steps (reuse it; do not redo their work):\n${request.context}\n\n` : "") +
      `Step: ${request.title || request.stageId}\n` +
      `Instruction: ${request.instruction || "(follow the action type)"}\n` +
      `Inputs: ${JSON.stringify(request.input)}\n` +
      `Produce the concrete output for this step.`;

    const stream = client.messages.stream({
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    stream.on("text", (delta) => {
      this.gateway.emitDelta({ runId: request.runId, stageId: request.stageId, text: delta });
    });
    const response = await stream.finalMessage();

    const input = response.usage?.input_tokens ?? 0;
    const output = response.usage?.output_tokens ?? 0;
    const cached =
      (response.usage as { cache_read_input_tokens?: number } | undefined)?.cache_read_input_tokens ?? 0;
    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");

    return {
      output: { stageId: request.stageId, model, text },
      tokensConsumed: input + output,
      tokensInput: input,
      tokensOutput: output,
      tokensCached: cached,
      toolSavings: [],
      savings: [],
      verifierPassed: true,
    };
  }
}
