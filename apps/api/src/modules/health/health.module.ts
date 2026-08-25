import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { WhoamiController } from "./whoami.controller";

@Module({
  controllers: [HealthController, WhoamiController],
})
export class HealthModule {}
