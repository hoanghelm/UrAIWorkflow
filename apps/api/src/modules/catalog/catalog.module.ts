import { Module } from "@nestjs/common";
import { RunnerModule } from "../runner/runner.module";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { CatalogScanner } from "./catalog.scanner";

@Module({
  imports: [RunnerModule],
  controllers: [CatalogController],
  providers: [CatalogService, CatalogScanner],
  exports: [CatalogService],
})
export class CatalogModule {}
