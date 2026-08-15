import { Injectable } from "@nestjs/common";
import type { StageRequest, StageResult } from "./agent.port";
import type { ActiveConnector } from "../connectors/connectors.service";
import { streamChat, type ChatMessage } from "../connectors/copilot";
import { RunnerGateway } from "./runner.gateway";

type Tier = "opus" | "sonnet" | "haiku";

const LEVER_DIRECTIVE: Record<string, string> = {
  caveman: "Write in telegraphic style — drop filler words, keep code and errors exact.",
  ponytail: "Produce the minimum code that works; reuse existing code before writing new.",
  disclosure: "Only use context this step actually needs; do not restate background.",
};

@Injectable()
export class CopilotAgentAdapter {
  constructor(private readonly gateway: RunnerGateway) {}

  async run(request: StageRequest, connector: ActiveConnector): Promise<StageResult> {
    const model = connector.models[request.model as Tier] ?? request.model;
    const directives = request.levers
      .map((l) => LEVER_DIRECTIVE[l])
      .filter(Boolean)
      .join(" ");
    const base =
      request.persona ??
      `You are the "${request.agent}" step in a workflow. Action type: ${request.action}. Be terse. Return only the result for this step.`;
    const system = [base, request.guidance, directives].filter(Boolean).join(" ");
    const prompt =
      (request.context
        ? `Context from earlier steps (reuse it; do not redo their work):\n${request.context}\n\n`
        : "") +
      `Step: ${request.title || request.stageId}\n` +
      `Instruction: ${request.instruction || "(follow the action type)"}\n` +
      `Inputs: ${JSON.stringify(request.input)}\n` +
      `Produce the concrete output for this step.`;

    const messages: ChatMessage[] = [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ];

    let aborted = false;
    let result = { text: "", inputTokens: 0, outputTokens: 0 };
    try {
      result = await streamChat(
        connector.apiKey,
        model,
        messages,
        (delta) => this.gateway.emitDelta({ runId: request.runId, stageId: request.stageId, text: delta }),
        request.abortController?.signal,
      );
    } catch (err) {
      if (request.abortController?.signal.aborted) {
        aborted = true;
      } else {
        throw err;
      }
    }

    return {
      output: { stageId: request.stageId, model, text: result.text },
      tokensConsumed: result.inputTokens + result.outputTokens,
      tokensInput: result.inputTokens,
      tokensOutput: result.outputTokens,
      tokensCached: 0,
      toolSavings: [],
      savings: [],
      verifierPassed: true,
      aborted,
    };
  }
}
