import { Controller, Get, Param } from "@nestjs/common";
import { LedgerService } from "./ledger.service";

@Controller("ledger")
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get("run/:runId")
  run(@Param("runId") runId: string) {
    return this.ledger.summaryForRun(runId);
  }

  @Get("project/:projectId")
  project(@Param("projectId") projectId: string) {
    return this.ledger.summaryForProject(projectId);
  }
}
