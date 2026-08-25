import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { TestController } from "./test.controller";
import { TestService } from "./test.service";

@Module({
  imports: [AiModule],
  controllers: [TestController],
  providers: [TestService],
})
export class TestsModule {}
