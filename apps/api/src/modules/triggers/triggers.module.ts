import { Module } from "@nestjs/common";
import { WorkflowModule } from "../workflow/workflow.module";
import { RunnerModule } from "../runner/runner.module";
import { TriggersController } from "./triggers.controller";
import { TriggersService } from "./triggers.service";

@Module({
  imports: [WorkflowModule, RunnerModule],
  controllers: [TriggersController],
  providers: [TriggersService],
})
export class TriggersModule {}
