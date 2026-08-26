import { Module } from "@nestjs/common";
import { MarketplaceController } from "./marketplace.controller";
import { MarketplaceService } from "./marketplace.service";
import { BundlesModule } from "../bundles/bundles.module";

@Module({
  imports: [BundlesModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
