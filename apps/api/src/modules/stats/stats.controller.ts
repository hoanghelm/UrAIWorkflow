import { Controller, Get, Query } from "@nestjs/common";
import { StatsService } from "./stats.service";

@Controller("stats")
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  list(@Query("projectId") projectId?: string) {
    return this.stats.list(projectId);
  }
}
