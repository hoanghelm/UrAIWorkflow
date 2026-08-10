import { Module } from "@nestjs/common";
import { ArtifactsService } from "./artifacts.service";
import { WorktreeService } from "./worktree.service";

@Module({
  providers: [ArtifactsService, WorktreeService],
  exports: [ArtifactsService, WorktreeService],
})
export class ArtifactsModule {}
