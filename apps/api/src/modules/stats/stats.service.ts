import { Injectable } from "@nestjs/common";
import type { UsageStat } from "@vcc-workflow/schema";
import { PrismaService } from "../../prisma/prisma.service";

const CALL_PREFIX = "call · ";

interface Block {
  kind: UsageStat["blockKind"];
  name: string;
}

function parseCall(line: string): Block | null {
  if (!line.startsWith(CALL_PREFIX)) {
    return null;
  }
  const rest = line.slice(CALL_PREFIX.length);
  const mcp = rest.match(/^\[mcp:([^\]]+)\]/);
  if (mcp) {
    return { kind: "mcp", name: mcp[1] };
  }
  const skill = rest.match(/^\[skill\]\s+(\S+)/);
  if (skill) {
    return { kind: "skill", name: skill[1] };
  }
  const agent = rest.match(/^\[agent\]\s+(\S+)/);
  if (agent) {
    return { kind: "agent", name: agent[1] };
  }
  const raw = rest.match(/^(\S+)/);
  if (!raw) {
    return null;
  }
  const name = raw[1];
  if (name.startsWith("mcp__")) {
    return { kind: "mcp", name: name.split("__")[1] || name };
  }
  return { kind: "tool", name };
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordRun(runId: string, projectId?: string): Promise<void> {
    if (!projectId) {
      return;
    }
    const logs = await this.prisma.stageLog.findMany({
      where: { runId },
      select: { trace: true },
    });
    const tally = new Map<string, { block: Block; count: number }>();
    for (const { trace } of logs) {
      for (const line of (trace || "").split("\n")) {
        const block = parseCall(line);
        if (!block) {
          continue;
        }
        const key = `${block.kind}:${block.name}`;
        const entry = tally.get(key) ?? { block, count: 0 };
        entry.count += 1;
        tally.set(key, entry);
      }
    }
    const now = new Date();
    for (const { block, count } of tally.values()) {
      await this.prisma.usageStat.upsert({
        where: {
          projectId_blockKind_blockName: {
            projectId,
            blockKind: block.kind,
            blockName: block.name,
          },
        },
        create: {
          projectId,
          blockKind: block.kind,
          blockName: block.name,
          invocations: count,
          lastUsedAt: now,
        },
        update: { invocations: { increment: count }, lastUsedAt: now },
      });
    }
  }

  async backfill(projectId: string): Promise<{ runs: number; blocks: number }> {
    await this.prisma.usageStat.deleteMany({ where: { projectId } });
    const runs = await this.prisma.run.findMany({ where: { projectId }, select: { id: true } });
    for (const run of runs) {
      await this.recordRun(run.id, projectId);
    }
    const blocks = await this.prisma.usageStat.count({ where: { projectId } });
    return { runs: runs.length, blocks };
  }

  async list(projectId?: string): Promise<UsageStat[]> {
    const rows = await this.prisma.usageStat.findMany({
      where: projectId ? { projectId } : {},
      orderBy: [{ invocations: "desc" }, { lastUsedAt: "desc" }],
    });
    return rows.map((r) => ({
      blockKind: r.blockKind as UsageStat["blockKind"],
      blockName: r.blockName,
      invocations: r.invocations,
      lastUsedAt: r.lastUsedAt.toISOString(),
    }));
  }
}
