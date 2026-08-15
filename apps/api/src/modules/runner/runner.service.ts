import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { nanoid } from "nanoid";
import {
  guardrailsSchema,
  workflowSchema,
  type BreachReason,
  type CreateRunInput,
  type Guardrails,
  type RunEvent,
  type RunStatus,
  type Stage,
  type StageStatus,
  type Workflow,
} from "@vcc-workflow/schema";
import { PrismaService } from "../../prisma/prisma.service";
import { LedgerService } from "../ledger/ledger.service";
import { RunnerGateway } from "./runner.gateway";
import { AGENT_PORT, type AgentPort, type StageRequest, type StageResult } from "./agent.port";
import { agentByName, skillByName, mcpByName } from "../catalog/builtin-blocks";
import { Semaphore } from "./semaphore";
import { HeadroomService } from "./headroom.service";
import { WorktreeService } from "../board/worktree.service";
import { ArtifactsService } from "../board/artifacts.service";
import { StatsService } from "../stats/stats.service";

const MAX_CONCURRENT_AI = 3;

type StageOutcome =
  | {
      kind: "passed";
      tokensConsumed: number;
      saved: number;
      input: number;
      output: number;
      cached: number;
      outputText: string;
    }
  | { kind: "question"; question: string }
  | { kind: "breach"; reason: BreachReason };

interface EmitInput {
  level?: RunEvent["level"];
  stageId?: string;
  status?: RunStatus;
  stageStatus?: StageStatus;
  breach?: BreachReason;
  message: string;
}

@Injectable()
export class RunnerService implements OnModuleDestroy {
  private readonly limiter = new Semaphore(MAX_CONCURRENT_AI);
  private readonly running = new Map<string, AbortController>();

  onModuleDestroy(): void {
    for (const controller of this.running.values()) {
      controller.abort();
    }
    this.running.clear();
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly gateway: RunnerGateway,
    private readonly headroom: HeadroomService,
    private readonly worktrees: WorktreeService,
    private readonly artifactSvc: ArtifactsService,
    private readonly stats: StatsService,
    @Inject(AGENT_PORT) private readonly agent: AgentPort,
  ) {}

  headroomSnapshot() {
    return this.headroom.snapshot();
  }

  private async resolvePersona(projectId: string | null, agentName: string): Promise<string | undefined> {
    if (projectId) {
      const row = await this.prisma.catalogItem.findFirst({
        where: { projectId, kind: "agent", name: agentName },
      });
      if (row) {
        const meta = JSON.parse(row.meta) as Record<string, unknown>;
        if (typeof meta.system === "string" && meta.system.trim()) {
          return meta.system;
        }
      }
    }
    return agentByName[agentName]?.system;
  }

  private async resolveGuidance(projectId: string | null, skills: string[]): Promise<string> {
    const parts: string[] = [];
    for (const skill of skills) {
      let guidance: string | undefined;
      if (projectId) {
        const row = await this.prisma.catalogItem.findFirst({
          where: { projectId, kind: "skill", name: skill },
        });
        if (row) {
          const meta = JSON.parse(row.meta) as Record<string, unknown>;
          if (typeof meta.guidance === "string" && meta.guidance.trim()) {
            guidance = meta.guidance;
          }
        }
      }
      guidance = guidance ?? skillByName[skill]?.guidance;
      if (guidance) {
        parts.push(guidance);
      }
    }
    return parts.join(" ");
  }

  private resolveStageMcp(
    workflow: Workflow,
    stage: Stage,
  ): Record<string, unknown> | undefined {
    const servers: Record<string, unknown> = {};
    for (const name of stage.tools) {
      const injected = workflow.mcpServers?.[name];
      if (injected) {
        servers[name] = injected;
        continue;
      }
      const block = mcpByName[name];
      if (block) {
        servers[name] = block.config;
      }
    }
    return Object.keys(servers).length ? servers : undefined;
  }

  private async runAgent(request: StageRequest): Promise<StageResult> {
    const record = await this.headroom.acquire();
    try {
      const result = await this.limiter.run(() => this.agent.runStage(request));
      record(result.tokensConsumed);
      return result;
    } catch (error) {
      record(0);
      throw error;
    }
  }

  private injectPlan(workflow: Workflow): Workflow {
    const hasPlan = workflow.stages.some((s) => s.agent === "planner" || s.action === "plan");
    if (hasPlan) {
      return workflow;
    }
    const contextActions = new Set(["start", "read-design", "requirement", "analysis", "scan"]);
    const contextAgents = new Set([
      "ui-ux-designer",
      "analyst",
      "architect",
      "business-analyst",
      "software-architect",
    ]);
    const stages = [...workflow.stages];
    let at = 0;
    while (
      at < stages.length &&
      (contextActions.has(stages[at].action) || contextAgents.has(stages[at].agent))
    ) {
      at += 1;
    }
    const plan: Stage = {
      id: "plan",
      title: "Plan",
      action: "plan",
      description: "",
      instruction:
        "Read this workspace's conventions (its .claude rules and existing code) and the goal plus any context from earlier steps. Produce a concrete implementation plan: the ordered steps, which model tier fits each step (opus for hard reasoning, sonnet for coding, haiku for simple edits), the files likely involved, and clear acceptance criteria. Do not write the final code here — the later steps will follow this plan.",
      agent: "planner",
      model: "opus",
      skills: [],
      tools: [],
    };
    stages.splice(at, 0, plan);
    return { ...workflow, stages };
  }

  async create(input: CreateRunInput): Promise<{ id: string }> {
    const workflow = this.injectPlan(workflowSchema.parse(input.workflow));
    const runId = nanoid();

    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
      select: { name: true, root: true },
    });
    const isolated =
      !input.cwd && !input.cardId && project
        ? await this.worktrees.ensureIsolated(project.root, runId)
        : null;
    const cwd = input.cwd ?? isolated ?? project?.root ?? undefined;
    const build = (await this.prisma.run.count({ where: { projectId: input.projectId } })) + 1;
    const runName =
      !input.cardId && project ? `${project.name} · build ${build}` : workflow.name;

    await this.prisma.run.create({
      data: {
        id: runId,
        projectId: input.projectId,
        cardId: input.cardId ?? null,
        cwd: cwd ?? null,
        name: runName,
        pack: workflow.pack,
        status: "pending",
        workflow: JSON.stringify(workflow),
      },
    });

    await this.prisma.$transaction(
      workflow.stages.map((stage, index) =>
        this.prisma.stage.create({
          data: {
            runId,
            stageId: stage.id,
            title: stage.title,
            agent: stage.agent,
            model: stage.model,
            status: "pending",
            order: index,
          },
        }),
      ),
    );

    if (!input.cardId) {
      const taskTitle = input.title?.trim() || workflow.name;
      await this.captureRunOnBoard(runId, input.projectId, workflow, cwd, taskTitle);
    }

    this.gateway.emitStarted({
      runId,
      name: runName,
      pack: workflow.pack,
      projectId: input.projectId,
    });
    void this.execute(runId, workflow);
    return { id: runId };
  }

  private async captureRunOnBoard(
    runId: string,
    projectId: string,
    workflow: Workflow,
    cwd?: string,
    taskTitle?: string,
  ): Promise<void> {
    const title = taskTitle || workflow.name;
    const maxLoops = guardrailsSchema.parse(workflow.guardrails).maxLoopDepth;
    const model = workflow.routing.exec;
    const existing = await this.prisma.boardCard.findFirst({
      where: { projectId, parentId: null, title },
      orderBy: { createdAt: "asc" },
    });
    let taskId: string;
    if (existing) {
      taskId = existing.id;
      await this.prisma.boardCard.update({
        where: { id: taskId },
        data: { runId, worktree: cwd ?? null, status: "in_process", model, maxLoops },
      });
      await this.prisma.boardCard.deleteMany({ where: { parentId: taskId } });
    } else {
      taskId = nanoid();
      const order = await this.prisma.boardCard.count({ where: { projectId, parentId: null } });
      await this.prisma.boardCard.create({
        data: {
          id: taskId,
          projectId,
          title,
          requirement: "",
          type: "task",
          parentId: null,
          pack: workflow.pack,
          model,
          maxLoops,
          status: "in_process",
          review: "none",
          runId,
          worktree: cwd ?? null,
          artifacts: "[]",
          links: "[]",
          order,
        },
      });
    }
    const steps = workflow.stages.filter(
      (s) => s.action !== "start" && s.action !== "end" && s.action !== "break",
    );
    for (let i = 0; i < steps.length; i += 1) {
      const stage = steps[i];
      await this.prisma.boardCard.create({
        data: {
          id: `${taskId}::${stage.id}`,
          projectId,
          title: stage.title || stage.id,
          requirement: stage.instruction ?? "",
          type: "task",
          parentId: taskId,
          pack: workflow.pack,
          model: stage.model === "inherit" ? model : stage.model,
          maxLoops: 1,
          status: "todo",
          review: "none",
          artifacts: "[]",
          links: "[]",
          order: i,
        },
      });
    }
    await this.prisma.run.update({ where: { id: runId }, data: { cardId: taskId } });
  }

  private async syncBoardStage(runId: string, stageId: string, status: string): Promise<void> {
    const task = await this.prisma.boardCard.findFirst({
      where: { runId, parentId: null },
      select: { id: true },
    });
    if (!task) {
      return;
    }
    await this.prisma.boardCard.updateMany({
      where: { id: `${task.id}::${stageId}` },
      data: { status },
    });
  }

  private async syncBoardOnFinish(runId: string, workflow: Workflow): Promise<void> {
    const task = await this.prisma.boardCard.findFirst({
      where: { runId, parentId: null },
    });
    if (!task) {
      return;
    }
    const artifacts = await this.artifactsFromTrace(runId);
    await this.prisma.boardCard.update({
      where: { id: task.id },
      data: { status: "review", artifacts: JSON.stringify(artifacts) },
    });
    await this.snapshotArtifact(runId, task.id, artifacts).catch(() => undefined);
    const stageRows = await this.prisma.stage.findMany({ where: { runId } });
    const byStage = new Map(stageRows.map((r) => [r.stageId, r.status]));
    for (const stage of workflow.stages) {
      const st = byStage.get(stage.id);
      const status = st === "passed" ? "completed" : st === "failed" ? "closed" : "review";
      await this.prisma.boardCard.updateMany({
        where: { id: `${task.id}::${stage.id}` },
        data: { status },
      });
    }
  }

  private async snapshotArtifact(
    runId: string,
    cardId: string,
    files: Array<{ name: string; path: string; kind: string }>,
  ): Promise<void> {
    const run = await this.prisma.run.findUnique({
      where: { id: runId },
      select: { cwd: true, projectId: true },
    });
    if (!run?.cwd) {
      return;
    }
    const build = (await this.prisma.artifact.count({ where: { cardId } })) + 1;
    const bundle = await this.artifactSvc.pack(run.cwd, runId);
    await this.prisma.artifact.create({
      data: {
        runId,
        projectId: run.projectId,
        cardId,
        build,
        name: `build ${build}`,
        path: bundle.path,
        files: JSON.stringify(files),
        sizeBytes: bundle.sizeBytes,
        fileCount: bundle.fileCount,
      },
    });
  }

  private async artifactsFromTrace(
    runId: string,
  ): Promise<Array<{ name: string; path: string; kind: string }>> {
    const logs = await this.prisma.stageLog.findMany({ where: { runId }, select: { trace: true } });
    const byPath = new Map<string, { name: string; path: string; kind: string }>();
    for (const { trace } of logs) {
      for (const line of (trace || "").split("\n")) {
        const m = line.match(/^call · (Write|Edit|NotebookEdit)\s+(.+)$/);
        if (!m) {
          continue;
        }
        const path = m[2].trim();
        const name = path.split(/[\\/]/).pop() || path;
        byPath.set(path, { name, path, kind: m[1] === "Edit" ? "edited" : "file" });
      }
    }
    return [...byPath.values()].slice(0, 200);
  }

  async runAiSession(opts: {
    runId?: string;
    name: string;
    pack?: string;
    projectId?: string;
    agent: string;
    action: string;
    instruction: string;
    persona?: string;
    guidance?: string;
    model: string;
    cwd?: string;
    input: Record<string, unknown>;
  }): Promise<{ runId: string; text: string }> {
    const runId = opts.runId ?? nanoid();
    const pack = opts.pack ?? "ai";
    await this.prisma.run.create({
      data: {
        id: runId,
        projectId: opts.projectId ?? null,
        kind: "session",
        name: opts.name,
        pack,
        status: "running",
        workflow: "{}",
      },
    });
    await this.prisma.stage.create({
      data: {
        runId,
        stageId: "ai",
        title: opts.name,
        agent: opts.agent,
        model: opts.model,
        status: "running",
        order: 0,
      },
    });
    this.gateway.emitStarted({ runId, name: opts.name, pack, projectId: opts.projectId });
    await this.emit(runId, { status: "running", stageId: "ai", message: `${opts.name} started` });

    const controller = new AbortController();
    this.running.set(runId, controller);
    let result: StageResult;
    try {
      result = await this.runAgent({
        runId,
        stageId: "ai",
        title: opts.name,
        agent: opts.agent,
        action: opts.action,
        instruction: opts.instruction,
        harness: false,
        persona: opts.persona,
        guidance: opts.guidance,
        model: opts.model,
        cwd: opts.cwd,
        skills: [],
        tools: [],
        input: opts.input,
        levers: [],
        abortController: controller,
      });
    } catch (error) {
      this.running.delete(runId);
      await this.updateStage(runId, "ai", { status: "failed" });
      await this.prisma.run.update({ where: { id: runId }, data: { status: "failed" } });
      await this.emit(runId, {
        level: "error",
        status: "failed",
        stageId: "ai",
        message: error instanceof Error ? error.message : "AI error",
      });
      throw error;
    }
    this.running.delete(runId);

    const text = typeof result.output.text === "string" ? result.output.text : "";
    await this.saveStageLog(runId, "ai", result.output, result.tokensConsumed, result.trace);
    await this.updateStage(runId, "ai", {
      status: "passed",
      model: opts.model,
      tokens: result.tokensConsumed,
    });
    if (result.tokensCached > 0) {
      await this.ledger.record({
        runId,
        stageId: "ai",
        lever: "cache",
        tokensBefore: result.tokensInput + result.tokensCached,
        tokensAfter: result.tokensInput,
        saved: result.tokensCached,
      });
    }
    let toolSaved = 0;
    for (const tool of result.toolSavings) {
      if (tool.saved > 0) {
        toolSaved += tool.saved;
        await this.ledger.record({
          runId,
          stageId: "ai",
          lever: tool.source,
          tokensBefore: 0,
          tokensAfter: 0,
          saved: tool.saved,
        });
      }
    }
    await this.prisma.run.update({
      where: { id: runId },
      data: {
        status: "done",
        tokensConsumed: { increment: result.tokensConsumed },
        tokensSaved: { increment: result.tokensCached + toolSaved },
        tokensInput: { increment: result.tokensInput },
        tokensOutput: { increment: result.tokensOutput },
        tokensCached: { increment: result.tokensCached },
      },
    });
    await this.emit(runId, {
      status: "done",
      stageId: "ai",
      stageStatus: "passed",
      message: `${opts.name} complete`,
    });
    return { runId, text };
  }

  async events(runId: string): Promise<RunEvent[]> {
    const rows = await this.prisma.runEvent.findMany({
      where: { runId },
      orderBy: { at: "asc" },
    });
    return rows.map((r) => ({
      runId,
      at: r.at.toISOString(),
      level: r.level as RunEvent["level"],
      stageId: r.stageId ?? undefined,
      status: (r.status as RunStatus | null) ?? undefined,
      stageStatus: (r.stageStatus as StageStatus | null) ?? undefined,
      breach: (r.breach as BreachReason | null) ?? undefined,
      message: r.message,
    }));
  }

  async runArtifacts(runId: string): Promise<{
    cardId: string | null;
    artifactId: string | null;
    worktree: string | null;
    artifacts: Array<{ name: string; path: string; kind: string }>;
  }> {
    const run = await this.prisma.run.findUnique({
      where: { id: runId },
      select: { cardId: true },
    });
    const card =
      (run?.cardId
        ? await this.prisma.boardCard.findUnique({
            where: { id: run.cardId },
            select: { id: true, worktree: true, artifacts: true },
          })
        : null) ??
      (await this.prisma.boardCard.findFirst({
        where: { runId, parentId: null },
        select: { id: true, worktree: true, artifacts: true },
      }));
    if (!card) {
      return { cardId: null, artifactId: null, worktree: null, artifacts: [] };
    }
    const artifact = await this.prisma.artifact.findFirst({
      where: { runId },
      orderBy: { createdAt: "desc" },
      select: { id: true, files: true },
    });
    const artifacts = artifact
      ? (JSON.parse(artifact.files || "[]") as Array<{ name: string; path: string; kind: string }>)
      : (JSON.parse(card.artifacts || "[]") as Array<{ name: string; path: string; kind: string }>);
    return {
      cardId: card.id,
      artifactId: artifact?.id ?? null,
      worktree: card.worktree,
      artifacts,
    };
  }

  async logs(runId: string): Promise<Record<string, { text: string; trace: string; tokens: number }>> {
    const rows = await this.prisma.stageLog.findMany({
      where: { runId },
      orderBy: { createdAt: "asc" },
    });
    const map: Record<string, { text: string; trace: string; tokens: number }> = {};
    for (const row of rows) {
      map[row.stageId] = { text: row.text, trace: row.trace, tokens: row.tokens };
    }
    return map;
  }

  get(runId: string) {
    return this.prisma.run.findUniqueOrThrow({
      where: { id: runId },
      include: {
        stages: { orderBy: { order: "asc" } },
        events: { orderBy: { at: "asc" } },
      },
    });
  }

  list(projectId?: string) {
    return this.prisma.run.findMany({
      where: projectId ? { projectId } : {},
      orderBy: { createdAt: "desc" },
      include: { stages: { orderBy: { order: "asc" } } },
    });
  }

  async resume(runId: string, answer: string): Promise<{ id: string; status: RunStatus }> {
    const run = await this.prisma.run.findUniqueOrThrow({ where: { id: runId } });
    if (run.status !== "needs_input") {
      return { id: runId, status: run.status as RunStatus };
    }
    const workflow = workflowSchema.parse(JSON.parse(run.workflow));
    await this.prisma.run.update({
      where: { id: runId },
      data: { status: "running", question: null },
    });
    await this.emit(runId, { status: "running", message: `Resumed with answer: ${answer}` });
    void this.execute(runId, workflow, answer);
    return { id: runId, status: "running" };
  }

  async remove(runId: string): Promise<{ id: string }> {
    await this.prisma.boardCard.updateMany({ where: { runId }, data: { runId: null } });
    await this.prisma.run.delete({ where: { id: runId } });
    return { id: runId };
  }

  async stop(runId: string): Promise<{ id: string; status: RunStatus }> {
    this.running.get(runId)?.abort();
    this.running.delete(runId);
    await this.prisma.run.update({
      where: { id: runId },
      data: { status: "failed", breach: "user_stop" },
    });
    await this.prisma.boardCard.updateMany({
      where: { runId, parentId: null },
      data: { status: "review" },
    });
    await this.emit(runId, {
      level: "error",
      status: "failed",
      breach: "user_stop",
      message: "Run stopped by user",
    });
    return { id: runId, status: "failed" };
  }

  async rerunStage(runId: string, stageId: string): Promise<{ id: string; status: RunStatus }> {
    this.running.get(runId)?.abort();
    this.running.delete(runId);
    const run = await this.prisma.run.findUniqueOrThrow({ where: { id: runId } });
    const workflow = workflowSchema.parse(JSON.parse(run.workflow));
    const rows = await this.prisma.stage.findMany({ where: { runId }, orderBy: { order: "asc" } });
    const from = rows.findIndex((r) => r.stageId === stageId);
    if (from < 0) {
      return { id: runId, status: run.status as RunStatus };
    }
    const reset = rows.slice(from).map((r) => r.stageId);
    await this.prisma.stage.updateMany({
      where: { runId, stageId: { in: reset } },
      data: { status: "pending", attempts: 0 },
    });
    await this.prisma.stageLog.deleteMany({ where: { runId, stageId: { in: reset } } });
    const task = await this.prisma.boardCard.findFirst({
      where: { runId, parentId: null },
      select: { id: true },
    });
    if (task) {
      await this.prisma.boardCard.updateMany({
        where: { id: { in: reset.map((sid) => `${task.id}::${sid}`) } },
        data: { status: "todo" },
      });
      await this.prisma.boardCard.update({ where: { id: task.id }, data: { status: "in_process" } });
    }
    await this.prisma.run.update({
      where: { id: runId },
      data: { status: "running", breach: null, question: null },
    });
    await this.emit(runId, { status: "running", message: `Re-running from "${stageId}"` });
    void this.execute(runId, workflow);
    return { id: runId, status: "running" };
  }

  private async execute(runId: string, workflow: Workflow, resumeAnswer?: string): Promise<void> {
    const guardrails = guardrailsSchema.parse(workflow.guardrails);
    await this.setStatus(runId, "running");

    const controller = new AbortController();
    this.running.set(runId, controller);
    try {

    const runRow = await this.prisma.run.findUniqueOrThrow({
      where: { id: runId },
      select: { cwd: true, tokensConsumed: true, projectId: true },
    });
    const cwd = runRow.cwd ?? undefined;
    const projectId = runRow.projectId;

    let budgetUsed = runRow.tokensConsumed;
    let loopDepth = 0;

    const rows = await this.prisma.stage.findMany({
      where: { runId },
      orderBy: { order: "asc" },
    });
    const remaining = rows.filter((r) => r.status !== "passed" && r.status !== "skipped");

    const logs = await this.prisma.stageLog.findMany({ where: { runId } });
    const logByStage = new Map(logs.map((l) => [l.stageId, l.text]));
    const prior: Array<{ title: string; text: string }> = rows
      .filter((r) => r.status === "passed")
      .map((r) => ({ title: r.title || r.stageId, text: logByStage.get(r.stageId) ?? "" }))
      .filter((p) => p.text);

    for (const row of remaining) {
      const stage = workflow.stages.find((s) => s.id === row.stageId);
      if (!stage) continue;

      if (this.needsGate(stage, guardrails) && !resumeAnswer) {
        await this.pauseForInput(runId, stage, `Approval required for stage "${stage.title || stage.id}"`);
        return;
      }
      resumeAnswer = undefined;

      if (controller.signal.aborted) {
        return;
      }

      const context = this.buildContext(prior);
      const outcome = await this.runStageWithRetries(
        runId,
        projectId,
        context,
        workflow,
        stage,
        guardrails,
        cwd,
        controller,
        () => {
          loopDepth += 1;
          return loopDepth <= guardrails.maxLoopDepth;
        },
      );

      if (outcome.kind === "passed" && outcome.outputText) {
        prior.push({ title: stage.title || stage.id, text: outcome.outputText });
      }

      if (outcome.kind === "breach") {
        await this.breach(runId, outcome.reason, guardrails);
        return;
      }
      if (outcome.kind === "question") {
        await this.pauseForInput(runId, stage, outcome.question);
        return;
      }

      budgetUsed += outcome.tokensConsumed;
      await this.prisma.run.update({
        where: { id: runId },
        data: {
          tokensConsumed: { increment: outcome.tokensConsumed },
          tokensSaved: { increment: outcome.saved },
          tokensInput: { increment: outcome.input },
          tokensOutput: { increment: outcome.output },
          tokensCached: { increment: outcome.cached },
        },
      });

      if (guardrails.budget.tokens && budgetUsed > guardrails.budget.tokens) {
        await this.breach(runId, "budget_hit", guardrails);
        return;
      }
    }

      await this.setStatus(runId, "done");
      await this.syncBoardOnFinish(runId, workflow);
      await this.stats.recordRun(runId, runRow.projectId ?? undefined).catch(() => {});
      await this.emit(runId, { status: "done", message: "Run complete" });
    } finally {
      this.running.delete(runId);
    }
  }

  private buildContext(prior: Array<{ title: string; text: string }>): string {
    if (prior.length === 0) {
      return "";
    }
    return prior.map((p) => `### ${p.title}\n${p.text.slice(0, 3500)}`).join("\n\n");
  }

  private async runStageWithRetries(
    runId: string,
    projectId: string | null,
    context: string,
    workflow: Workflow,
    stage: Stage,
    guardrails: Guardrails,
    cwd: string | undefined,
    controller: AbortController,
    allowLoop: () => boolean,
  ): Promise<StageOutcome> {
    await this.updateStage(runId, stage.id, { status: "running" });
    await this.syncBoardStage(runId, stage.id, "in_process");
    await this.emit(runId, {
      stageId: stage.id,
      stageStatus: "running",
      message: `Stage "${stage.title || stage.id}" started`,
    });

    if (stage.action === "start" || stage.action === "end" || stage.action === "break") {
      await this.updateStage(runId, stage.id, { status: "passed" });
      await this.emit(runId, {
        stageId: stage.id,
        stageStatus: "passed",
        message: `${stage.title || stage.action}`,
      });
      return { kind: "passed", tokensConsumed: 0, saved: 0, input: 0, output: 0, cached: 0, outputText: "" };
    }

    const model = this.resolveModel(stage, workflow);
    let attempts = 0;
    while (attempts <= guardrails.maxRetries) {
      if (!allowLoop()) {
        await this.updateStage(runId, stage.id, { status: "failed" });
        return { kind: "breach", reason: "retry_exhausted" };
      }
      attempts += 1;
      await this.updateStage(runId, stage.id, { attempts });

      let result: StageResult;
      try {
        result = await this.runAgent({
          runId,
          stageId: stage.id,
          title: stage.title,
          agent: stage.agent,
          action: stage.action,
          instruction: stage.instruction,
          model,
          cwd,
          harness: true,
          context,
          persona: await this.resolvePersona(projectId, stage.agent),
          guidance: await this.resolveGuidance(projectId, stage.skills),
          skills: stage.skills,
          tools: stage.tools,
          input: workflow.inputs,
          levers: workflow.levers,
          mcpServers: this.resolveStageMcp(workflow, stage),
          abortController: controller,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          await this.updateStage(runId, stage.id, { status: "failed" });
          return { kind: "breach", reason: "user_stop" };
        }
        const message = error instanceof Error ? error.message : "agent error";
        await this.emit(runId, {
          level: "warn",
          stageId: stage.id,
          message: `Agent error, attempt ${attempts}/${guardrails.maxRetries + 1}: ${message}`,
        });
        continue;
      }

      if (result.aborted || controller.signal.aborted) {
        await this.updateStage(runId, stage.id, { status: "failed" });
        return { kind: "breach", reason: "user_stop" };
      }

      if (result.tokensCached > 0) {
        await this.ledger.record({
          runId,
          stageId: stage.id,
          lever: "cache",
          tokensBefore: result.tokensInput + result.tokensCached,
          tokensAfter: result.tokensInput,
          saved: result.tokensCached,
        });
      }
      for (const tool of result.toolSavings) {
        if (tool.saved > 0) {
          await this.ledger.record({
            runId,
            stageId: stage.id,
            lever: tool.source,
            tokensBefore: 0,
            tokensAfter: 0,
            saved: tool.saved,
          });
        }
      }
      await this.checkpoint(runId, stage.id, result.output);
      await this.saveStageLog(runId, stage.id, result.output, result.tokensConsumed, result.trace);

      if (result.question) {
        return { kind: "question", question: result.question };
      }

      const passed = guardrails.qualityThreshold === "advisory" || result.verifierPassed;
      if (passed) {
        await this.updateStage(runId, stage.id, {
          status: "passed",
          model,
          tokens: result.tokensConsumed,
        });
        await this.syncBoardStage(runId, stage.id, "completed");
        await this.emit(runId, {
          stageId: stage.id,
          stageStatus: "passed",
          message: `Stage "${stage.title || stage.id}" passed`,
        });
        const toolSaved = result.toolSavings.reduce((sum, t) => sum + Math.max(0, t.saved), 0);
        return {
          kind: "passed",
          tokensConsumed: result.tokensConsumed,
          saved: result.tokensCached + toolSaved,
          input: result.tokensInput,
          output: result.tokensOutput,
          cached: result.tokensCached,
          outputText: typeof result.output.text === "string" ? result.output.text : "",
        };
      }

      await this.emit(runId, {
        level: "warn",
        stageId: stage.id,
        message: `Verifier failed, attempt ${attempts}/${guardrails.maxRetries}`,
      });
    }

    await this.updateStage(runId, stage.id, { status: "failed" });
    await this.syncBoardStage(runId, stage.id, "closed");
    return { kind: "breach", reason: "retry_exhausted" };
  }

  private resolveModel(stage: Stage, workflow: Workflow): string {
    return stage.model === "inherit" ? workflow.routing.exec : stage.model;
  }

  private needsGate(_stage: Stage, _guardrails: Guardrails): boolean {
    return false;
  }

  private async pauseForInput(runId: string, stage: Stage, question: string): Promise<void> {
    await this.prisma.run.update({
      where: { id: runId },
      data: { status: "needs_input", question },
    });
    await this.updateStage(runId, stage.id, { status: "pending" });
    await this.emit(runId, {
      level: "warn",
      stageId: stage.id,
      status: "needs_input",
      message: question,
    });
  }

  private async breach(runId: string, reason: BreachReason, guardrails: Guardrails): Promise<void> {
    const status: RunStatus = guardrails.onBreach === "pause" ? "needs_input" : "failed";
    await this.prisma.run.update({
      where: { id: runId },
      data: { status, breach: reason },
    });
    await this.prisma.boardCard.updateMany({
      where: { runId, parentId: null },
      data: { status: "review" },
    });
    await this.emit(runId, {
      level: "error",
      status,
      breach: reason,
      message: `Guardrail breach: ${reason}`,
    });
  }

  private async saveStageLog(
    runId: string,
    stageId: string,
    output: Record<string, unknown>,
    tokens: number,
    trace = "",
  ): Promise<void> {
    const text = typeof output.text === "string" ? output.text : "";
    if (!text && !trace) {
      return;
    }
    await this.prisma.stageLog.upsert({
      where: { runId_stageId: { runId, stageId } },
      create: { runId, stageId, text, trace, tokens },
      update: { text, trace, tokens },
    });
  }

  private async checkpoint(runId: string, stageId: string, state: Record<string, unknown>): Promise<void> {
    await this.prisma.checkpoint.create({
      data: { runId, stageId, state: JSON.stringify(state) },
    });
  }

  private async setStatus(runId: string, status: RunStatus): Promise<void> {
    await this.prisma.run.update({ where: { id: runId }, data: { status } });
  }

  private async updateStage(
    runId: string,
    stageId: string,
    data: { status?: StageStatus; attempts?: number; model?: string; tokens?: number },
  ): Promise<void> {
    await this.prisma.stage.updateMany({ where: { runId, stageId }, data });
  }

  private async emit(runId: string, input: EmitInput): Promise<void> {
    const event: RunEvent = {
      runId,
      at: new Date().toISOString(),
      level: input.level ?? "info",
      stageId: input.stageId,
      status: input.status,
      stageStatus: input.stageStatus,
      breach: input.breach,
      message: input.message,
    };
    await this.prisma.runEvent.create({
      data: {
        runId,
        level: event.level,
        stageId: event.stageId ?? null,
        status: event.status ?? null,
        stageStatus: event.stageStatus ?? null,
        breach: event.breach ?? null,
        message: event.message,
      },
    });
    this.gateway.emitEvent(event);
  }
}
