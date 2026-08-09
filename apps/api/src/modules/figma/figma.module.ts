import { Module } from "@nestjs/common";
import { WorkflowModule } from "../workflow/workflow.module";
import { RunnerModule } from "../runner/runner.module";
import { FigmaController } from "./figma.controller";
import { FigmaService } from "./figma.service";

@Module({
  imports: [WorkflowModule, RunnerModule],
  controllers: [FigmaController],
  providers: [FigmaService],
})
export class FigmaModule {}
