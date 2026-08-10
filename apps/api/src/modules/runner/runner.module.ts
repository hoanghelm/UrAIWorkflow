import { Module } from "@nestjs/common";
import { LedgerModule } from "../ledger/ledger.module";
import { ConnectorsModule } from "../connectors/connectors.module";
import { ArtifactsModule } from "../board/artifacts.module";
import { RunnerController } from "./runner.controller";
import { RunnerService } from "./runner.service";
import { RunnerGateway } from "./runner.gateway";
import { HeadroomService } from "./headroom.service";
import { AGENT_PORT } from "./agent.port";
import { StubAgentAdapter } from "./agent.stub";
import { ClaudeAgentAdapter } from "./agent.claude";
import { ClaudeSubscriptionAdapter } from "./agent.subscription";
import { AgentRouter } from "./agent.router";

@Module({
  imports: [LedgerModule, ConnectorsModule, ArtifactsModule],
  controllers: [RunnerController],
  providers: [
    RunnerService,
    RunnerGateway,
    HeadroomService,
    StubAgentAdapter,
    ClaudeAgentAdapter,
    ClaudeSubscriptionAdapter,
    AgentRouter,
    { provide: AGENT_PORT, useClass: AgentRouter },
  ],
  exports: [RunnerService, AGENT_PORT],
})
export class RunnerModule {}
