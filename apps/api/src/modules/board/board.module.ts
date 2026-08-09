import { Module } from "@nestjs/common";
import { WorkflowModule } from "../workflow/workflow.module";
import { RunnerModule } from "../runner/runner.module";
import { BoardController } from "./board.controller";
import { BoardService } from "./board.service";
import { WorktreeService } from "./worktree.service";
import { ArtifactsService } from "./artifacts.service";
import { PreviewService } from "./preview.service";

@Module({
  imports: [WorkflowModule, RunnerModule],
  controllers: [BoardController],
  providers: [BoardService, WorktreeService, ArtifactsService, PreviewService],
})
export class BoardModule {}
