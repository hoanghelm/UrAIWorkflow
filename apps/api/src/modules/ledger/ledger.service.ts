import { Injectable } from "@nestjs/common";
import type { LedgerEntry, LedgerSummary } from "@vcc-workflow/schema";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: LedgerEntry): Promise<void> {
    await this.prisma.ledgerEntry.create({
      data: {
        runId: entry.runId,
        stageId: entry.stageId,
        lever: entry.lever,
        tokensBefore: entry.tokensBefore,
        tokensAfter: entry.tokensAfter,
        saved: entry.saved,
      },
    });
  }

  async summaryForRun(runId: string): Promise<LedgerSummary> {
    const run = await this.prisma.run.findUniqueOrThrow({
      where: { id: runId },
      select: {
        tokensConsumed: true,
        tokensSaved: true,
        tokensInput: true,
        tokensOutput: true,
        tokensCached: true,
      },
    });
    const rows = await this.prisma.ledgerEntry.findMany({ where: { runId } });
    return {
      runId,
      tokensConsumed: run.tokensConsumed,
      tokensSaved: run.tokensSaved,
      tokensInput: run.tokensInput,
      tokensOutput: run.tokensOutput,
      tokensCached: run.tokensCached,
      byLever: this.byLever(rows),
    };
  }

  async summaryForProject(projectId: string): Promise<LedgerSummary> {
    const runs = await this.prisma.run.findMany({
      where: { projectId },
      select: {
        tokensConsumed: true,
        tokensSaved: true,
        tokensInput: true,
        tokensOutput: true,
        tokensCached: true,
      },
    });
    const rows = await this.prisma.ledgerEntry.findMany({
      where: { run: { projectId } },
    });
    const sum = (k: "tokensConsumed" | "tokensSaved" | "tokensInput" | "tokensOutput" | "tokensCached") =>
      runs.reduce((total, r) => total + r[k], 0);
    return {
      projectId,
      tokensConsumed: sum("tokensConsumed"),
      tokensSaved: sum("tokensSaved"),
      tokensInput: sum("tokensInput"),
      tokensOutput: sum("tokensOutput"),
      tokensCached: sum("tokensCached"),
      byLever: this.byLever(rows),
    };
  }

  private byLever(rows: Array<{ lever: string; saved: number }>): Record<string, number> {
    const totals: Record<string, number> = {};
    for (const row of rows) {
      totals[row.lever] = (totals[row.lever] ?? 0) + row.saved;
    }
    return totals;
  }
}
