import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { HostedAuthGuard } from "./common/hosted-auth.guard";
import { PrismaModule } from "./prisma/prisma.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { PacksModule } from "./modules/packs/packs.module";
import { LedgerModule } from "./modules/ledger/ledger.module";
import { ConnectorsModule } from "./modules/connectors/connectors.module";
import { MarketplaceModule } from "./modules/marketplace/marketplace.module";
import { BundlesModule } from "./modules/bundles/bundles.module";
import { WorkflowModule } from "./modules/workflow/workflow.module";
import { RunnerModule } from "./modules/runner/runner.module";
import { TriggersModule } from "./modules/triggers/triggers.module";
import { BoardModule } from "./modules/board/board.module";
import { DiagramsModule } from "./modules/diagrams/diagrams.module";
import { DesignModule } from "./modules/design/design.module";
import { TestsModule } from "./modules/tests/test.module";
import { AiModule } from "./modules/ai/ai.module";
import { FigmaModule } from "./modules/figma/figma.module";
import { HealthModule } from "./modules/health/health.module";
import { StatsModule } from "./modules/stats/stats.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CatalogModule,
    PacksModule,
    LedgerModule,
    ConnectorsModule,
    MarketplaceModule,
    BundlesModule,
    WorkflowModule,
    RunnerModule,
    TriggersModule,
    BoardModule,
    DiagramsModule,
    DesignModule,
    TestsModule,
    AiModule,
    FigmaModule,
    HealthModule,
    StatsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: HostedAuthGuard }],
})
export class AppModule {}
