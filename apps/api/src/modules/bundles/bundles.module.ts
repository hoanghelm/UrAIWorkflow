import { Module } from "@nestjs/common";
import { BundlesService } from "./bundles.service";

@Module({
  providers: [BundlesService],
  exports: [BundlesService],
})
export class BundlesModule {}
