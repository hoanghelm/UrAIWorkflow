import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { DiagramsController } from "./diagrams.controller";

@Module({
  imports: [AiModule],
  controllers: [DiagramsController],
})
export class DiagramsModule {}
