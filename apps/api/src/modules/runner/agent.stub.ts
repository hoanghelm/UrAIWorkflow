import { Injectable } from "@nestjs/common";
import type { AgentPort, StageRequest, StageResult } from "./agent.port";
import { RunnerGateway } from "./runner.gateway";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class StubAgentAdapter implements AgentPort {
  constructor(private readonly gateway: RunnerGateway) {}

  async runStage(request: StageRequest): Promise<StageResult> {
    const message =
      `[${request.agent}] ${request.action} — working on "${request.title || request.stageId}". ` +
      `${request.instruction ? `Task: ${request.instruction}. ` : ""}` +
      `Applying levers: ${request.levers.join(", ") || "none"}. Producing result…`;

    for (const chunk of message.match(/.{1,6}/g) ?? []) {
      this.gateway.emitDelta({ runId: request.runId, stageId: request.stageId, text: chunk });
      await sleep(35);
    }
    this.gateway.emitDelta({ runId: request.runId, stageId: request.stageId, text: " ✓\n" });

    const input = Math.round(message.length / 4);
    const output = Math.round(message.length / 4);

    return {
      output: { stageId: request.stageId, agent: request.agent, model: request.model, text: message },
      tokensConsumed: input + output,
      tokensInput: input,
      tokensOutput: output,
      tokensCached: 0,
      toolSavings: [],
      savings: [],
      verifierPassed: true,
    };
  }
}
