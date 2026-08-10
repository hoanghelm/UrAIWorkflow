import { Module } from "@nestjs/common";
import { WorkflowModule } from "../workflow/workflow.module";
import { RunnerModule } from "../runner/runner.module";
import { BoardController } from "./board.controller";
import { BoardService } from "./board.service";
import { ArtifactsModule } from "./artifacts.module";
import { PreviewService } from "./preview.service";

@Module({
  imports: [WorkflowModule, RunnerModule, ArtifactsModule],
  controllers: [BoardController],
  providers: [BoardService, PreviewService],
})
export class BoardModule {}
