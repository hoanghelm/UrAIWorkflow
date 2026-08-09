import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await this.$connect();
    await this.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
