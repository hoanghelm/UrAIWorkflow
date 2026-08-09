import { Controller, Get } from "@nestjs/common";
import { healthStatusSchema } from "@vcc-workflow/schema";
import { PrismaService } from "../../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let db: "up" | "down" = "up";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = "down";
    }
    return healthStatusSchema.parse({
      status: db === "up" ? "ok" : "degraded",
      db,
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }
}
