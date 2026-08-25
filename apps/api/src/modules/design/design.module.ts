import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { DesignController } from "./design.controller";
import { DesignService } from "./design.service";

@Module({
  imports: [AiModule],
  controllers: [DesignController],
  providers: [DesignService],
})
export class DesignModule {}
