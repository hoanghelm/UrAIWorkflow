import { test } from "node:test";
import assert from "node:assert/strict";
import type { Workflow } from "@vcc-workflow/schema";
import { RunnerService } from "./runner.service";
import type { AgentPort, StageResult } from "./agent.port";

function createFakePrisma() {
  const runs = new Map<string, any>();
  const stages: any[] = [];
  return {
    run: {
      create: async ({ data }: any) => {
        const row = { tokensConsumed: 0, tokensSaved: 0, breach: null, question: null, cwd: null, ...data };
        runs.set(data.id, row);
        return row;
      },
      findUnique: async ({ where }: any) => {
        const row = runs.get(where.id);
        return row ? { ...row } : null;
      },
      findUniqueOrThrow: async ({ where }: any) => {
        const row = runs.get(where.id);
        if (!row) throw new Error(`run not found: ${where.id}`);
        return { ...row };
      },
      count: async () => runs.size,
      update: async ({ where, data }: any) => {
        const row = runs.get(where.id);
        if (data.tokensConsumed?.increment !== undefined) {
          row.tokensConsumed += data.tokensConsumed.increment;
        }
        if (data.tokensSaved?.increment !== undefined) {
          row.tokensSaved += data.tokensSaved.increment;
        }
        if (data.status !== undefined) row.status = data.status;
        if (data.breach !== undefined) row.breach = data.breach;
        if (data.question !== undefined) row.question = data.question;
        return row;
      },
    },
    stage: {
      create: async ({ data }: any) => {
        const row = { attempts: 0, ...data };
        stages.push(row);
        return row;
      },
      findMany: async ({ where }: any) => stages.filter((s) => s.runId === where.runId),
      updateMany: async ({ where, data }: any) => {
        for (const s of stages) {
          if (s.runId === where.runId && s.stageId === where.stageId) Object.assign(s, data);
        }
      },
    },
    runEvent: { create: async () => ({}) },
    stageLog: { upsert: async () => ({}), findMany: async () => [] },
    checkpoint: { create: async () => ({}) },
    catalogItem: { findFirst: async () => null },
    project: { findUnique: async () => null },
    boardCard: {
      findFirst: async () => null,
      create: async () => ({}),
      update: async () => ({}),
      updateMany: async () => ({}),
      deleteMany: async () => ({}),
      count: async () => 0,
    },
    artifact: { count: async () => 0, create: async () => ({}) },
    $transaction: async (arr: Promise<unknown>[]) => Promise.all(arr),
    _runs: runs,
  };
}

function createFakeAgent(tokensPerStage: number): AgentPort {
  let asked = false;
  return {
    async runStage(request): Promise<StageResult> {
      const base = {
        output: { text: `ran ${request.stageId}` },
        tokensConsumed: tokensPerStage,
        tokensInput: tokensPerStage,
        tokensOutput: 0,
        tokensCached: 0,
        toolSavings: [],
        savings: [],
        verifierPassed: true,
      };
      if (request.stageId === "s1" && !asked) {
        asked = true;
        return { ...base, tokensConsumed: 0, tokensInput: 0, question: "Approve?" };
      }
      return base;
    },
  };
}

const fakeLedger = { record: async () => {} } as any;
const fakeGateway = {
  emitStarted: () => {},
  emitEvent: () => {},
  emitDelta: () => {},
} as any;

async function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("timed out waiting for condition");
    await new Promise((r) => setTimeout(r, 5));
  }
}

function buildWorkflow(): Workflow {
  return {
    name: "budget-regression",
    pack: "test",
    inputs: {},
    stages: [
      { id: "s1", title: "Stage 1", action: "ai-task", description: "", instruction: "", agent: "dev", model: "inherit", skills: [], tools: [] },
      { id: "s2", title: "Stage 2", action: "ai-task", description: "", instruction: "", agent: "dev", model: "inherit", skills: [], tools: [], gate: "approve" },
    ],
    levers: [],
    routing: { plan: "opus", exec: "sonnet" },
    guardrails: {
      maxRetries: 0,
      maxLoopDepth: 8,
      budget: { tokens: 100 },
      stageTimeoutMs: 600000,
      qualityThreshold: "advisory",
      onBreach: "stop",
      requireHumanGate: [],
      allowedTools: [],
      backgroundSpend: false,
    },
  };
}

test("budget guardrail breaches on cumulative tokens across a resume, not just the post-resume slice", async () => {
  const prisma = createFakePrisma();
  const agent = createFakeAgent(60);
  const fakeHeadroom = { acquire: async () => () => {}, snapshot: () => ({}) };
  const fakeWorktrees = { ensureIsolated: async () => null, remove: async () => {} } as any;
  const fakeArtifacts = {
    pack: async () => ({ path: "", sizeBytes: 0, fileCount: 0 }),
    unpack: async () => {},
  } as any;
  const fakeStats = { recordRun: async () => {}, list: async () => [] } as any;
  const runner = new RunnerService(
    prisma as any,
    fakeLedger,
    fakeGateway,
    fakeHeadroom as any,
    fakeWorktrees,
    fakeArtifacts,
    fakeStats,
    agent,
  );

  const { id: runId } = await runner.create({ projectId: "p1", workflow: buildWorkflow() });

  await waitFor(() => prisma._runs.get(runId)?.status === "needs_input");
  assert.equal(prisma._runs.get(runId).tokensConsumed, 60, "stage 1 should have consumed 60 tokens before the gate");

  await runner.resume(runId, "approved");
  await waitFor(() => {
    const status = prisma._runs.get(runId)?.status;
    return status === "failed" || status === "done";
  });

  const finalRun = prisma._runs.get(runId);
  assert.equal(
    finalRun.tokensConsumed,
    120,
    "total consumed tokens across both stages should be 120",
  );
  assert.equal(
    finalRun.status,
    "failed",
    "run should breach the 100-token budget once cumulative usage crosses it, even after a resume",
  );
  assert.equal(finalRun.breach, "budget_hit");
});
