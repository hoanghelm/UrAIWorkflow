import { Injectable } from "@nestjs/common";
import type { AgentPort, StageRequest, StageResult } from "./agent.port";
import { StubAgentAdapter } from "./agent.stub";
import { ClaudeAgentAdapter } from "./agent.claude";
import { ClaudeSubscriptionAdapter } from "./agent.subscription";
import { ConnectorsService } from "../connectors/connectors.service";

@Injectable()
export class AgentRouter implements AgentPort {
  constructor(
    private readonly stub: StubAgentAdapter,
    private readonly claude: ClaudeAgentAdapter,
    private readonly subscription: ClaudeSubscriptionAdapter,
    private readonly connectors: ConnectorsService,
  ) {}

  async runStage(request: StageRequest): Promise<StageResult> {
    const active = await this.connectors.getActive();
    if (active && active.provider === "claude-agent") {
      return this.subscription.run(request, active);
    }
    if (active && active.provider === "claude" && active.apiKey) {
      return this.claude.run(request, active);
    }
    return this.stub.runStage(request);
  }
}
