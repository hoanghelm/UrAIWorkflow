import { Module } from "@nestjs/common";
import { RunnerModule } from "../runner/runner.module";
import { PacksModule } from "../packs/packs.module";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";

@Module({
  imports: [RunnerModule, PacksModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
