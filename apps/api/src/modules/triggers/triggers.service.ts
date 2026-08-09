import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { nanoid } from "nanoid";
import {
  createTriggerInputSchema,
  triggerSchema,
  type CreateTriggerInput,
  type Trigger,
} from "@vcc-workflow/schema";
import { PrismaService } from "../../prisma/prisma.service";
import { WorkflowService } from "../workflow/workflow.service";
import { RunnerService } from "../runner/runner.service";

interface TriggerRow {
  id: string;
  name: string;
  projectId: string;
  pack: string;
  type: string;
  intervalSec: number;
  enabled: boolean;
  lastRunAt: Date | null;
}

@Injectable()
export class TriggersService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: WorkflowService,
    private readonly runner: RunnerService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.tick().catch(() => undefined);
    }, 60_000);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async tick(): Promise<void> {
    const now = Date.now();
    const due = await this.prisma.trigger.findMany({
      where: { enabled: true, type: "schedule" },
    });
    for (const t of due) {
      const last = t.lastRunAt ? t.lastRunAt.getTime() : 0;
      if (now - last >= t.intervalSec * 1000) {
        await this.fire(t.id).catch(() => undefined);
      }
    }
  }

  async list(projectId?: string): Promise<Trigger[]> {
    const rows = await this.prisma.trigger.findMany({
      where: projectId ? { projectId } : {},
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mask(r));
  }

  async create(input: CreateTriggerInput): Promise<Trigger> {
    const parsed = createTriggerInputSchema.parse(input);
    const row = await this.prisma.trigger.create({
      data: {
        id: nanoid(),
        name: parsed.name,
        projectId: parsed.projectId,
        pack: parsed.pack,
        type: parsed.type,
        intervalSec: parsed.intervalSec,
        enabled: parsed.enabled,
      },
    });
    return this.mask(row);
  }

  async setEnabled(id: string, enabled: boolean): Promise<Trigger> {
    const row = await this.prisma.trigger.update({ where: { id }, data: { enabled } });
    return this.mask(row);
  }

  async remove(id: string): Promise<{ id: string }> {
    await this.prisma.trigger.delete({ where: { id } });
    return { id };
  }

  async fire(id: string): Promise<{ runId: string }> {
    const t = await this.prisma.trigger.findUniqueOrThrow({ where: { id } });
    const workflow = await this.workflow.fromPack(t.pack, {});
    const run = await this.runner.create({ projectId: t.projectId, workflow });
    await this.prisma.trigger.update({ where: { id }, data: { lastRunAt: new Date() } });
    return { runId: run.id };
  }

  private mask(row: TriggerRow): Trigger {
    return triggerSchema.parse({
      id: row.id,
      name: row.name,
      projectId: row.projectId,
      pack: row.pack,
      type: row.type,
      intervalSec: row.intervalSec,
      enabled: row.enabled,
      lastRunAt: row.lastRunAt ? row.lastRunAt.toISOString() : null,
    });
  }
}
