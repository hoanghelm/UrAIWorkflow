import { Module } from "@nestjs/common";
import { PacksModule } from "../packs/packs.module";
import { AiModule } from "../ai/ai.module";
import { WorkflowController } from "./workflow.controller";
import { WorkflowService } from "./workflow.service";

@Module({
  imports: [PacksModule, AiModule],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
