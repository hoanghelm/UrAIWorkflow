import { BadRequestException, Injectable } from "@nestjs/common";
import { join } from "node:path";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  boardCardSchema,
  boardCommentSchema,
  createBoardCardInputSchema,
  createBoardCommentInputSchema,
  guardrailsSchema,
  itemTypeSchema,
  workflowSchema,
  type BoardCard,
  type BoardComment,
  type BoardStatus,
  type CreateBoardCardInput,
  type CreateBoardCommentInput,
} from "@vcc-workflow/schema";
import { PrismaService } from "../../prisma/prisma.service";
import { WorkflowService } from "../workflow/workflow.service";
import { RunnerService } from "../runner/runner.service";
import { agentByName } from "../catalog/builtin-blocks";
import { WorktreeService } from "./worktree.service";
import { ArtifactsService } from "./artifacts.service";
import { PreviewService } from "./preview.service";

const BOARD_ASSISTANT_PERSONA =
  "You are an assistant collaborating on a work item's discussion thread. " +
  "Someone has mentioned you to help move the item forward. Be concise and direct: answer the " +
  "question asked, make a clear decision when one is needed to unblock a paused run, or state the " +
  "concrete next step you would take. Ground your answer in the item's requirement and the discussion. " +
  "Do not restate the whole context back; reply as a short, useful comment.";

const planItemSchema = z.object({
  title: z.string().min(1),
  type: itemTypeSchema.catch("task").default("task"),
  requirement: z.string().default(""),
});

interface CardRow {
  id: string;
  projectId: string;
  title: string;
  requirement: string;
  type: string;
  parentId: string | null;
  pack: string;
  model: string;
  maxLoops: number;
  status: string;
  review: string;
  runId: string | null;
  worktree: string | null;
  artifacts: string;
  links: string;
  order: number;
}

@Injectable()
export class BoardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: WorkflowService,
    private readonly runner: RunnerService,
    private readonly worktree: WorktreeService,
    private readonly artifactSvc: ArtifactsService,
    private readonly preview: PreviewService,
  ) {}

  async list(projectId: string): Promise<BoardCard[]> {
    const rows = await this.prisma.boardCard.findMany({
      where: { projectId },
      orderBy: [{ status: "asc" }, { order: "asc" }],
    });
    return rows.map((r) => this.mask(r));
  }

  async create(input: CreateBoardCardInput): Promise<BoardCard> {
    const parsed = createBoardCardInputSchema.parse(input);
    const count = await this.prisma.boardCard.count({
      where: { projectId: parsed.projectId, status: "todo" },
    });
    const row = await this.prisma.boardCard.create({
      data: {
        id: nanoid(),
        projectId: parsed.projectId,
        title: parsed.title,
        requirement: parsed.requirement,
        type: parsed.type,
        parentId: parsed.parentId ?? null,
        pack: parsed.pack,
        model: parsed.model,
        maxLoops: parsed.maxLoops,
        status: "todo",
        order: count,
      },
    });
    return this.mask(row);
  }

  async move(id: string, status: BoardStatus, order: number): Promise<BoardCard> {
    const row = await this.prisma.boardCard.update({
      where: { id },
      data: { status, order },
    });
    return this.mask(row);
  }

  async remove(id: string): Promise<{ id: string }> {
    await this.prisma.boardCard.delete({ where: { id } });
    return { id };
  }

  async run(id: string): Promise<BoardCard> {
    const card = await this.prisma.boardCard.findUniqueOrThrow({ where: { id } });
    const project = await this.prisma.project.findUniqueOrThrow({ where: { id: card.projectId } });
    const worktree = await this.worktree.ensure(project.root, id);
    const base = await this.workflow.fromPack(card.pack, { requirement: card.requirement });
    const guardrails = guardrailsSchema.parse({
      ...base.guardrails,
      maxLoopDepth: card.maxLoops,
    });
    const workflow = {
      ...base,
      name: card.title,
      guardrails,
      routing: { plan: "opus", exec: card.model },
    };
    const created = await this.runner.create({
      projectId: card.projectId,
      cardId: id,
      cwd: worktree ?? undefined,
      workflow,
    });
    const row = await this.prisma.boardCard.update({
      where: { id },
      data: { runId: created.id, status: "in_process", worktree },
    });
    return this.mask(row);
  }

  async plan(id: string, streamId?: string): Promise<BoardCard[]> {
    const card = await this.prisma.boardCard.findUniqueOrThrow({ where: { id } });
    const instruction =
      `Decompose this ${card.type} into 3 to 7 concrete sub-items an engineer or AI can complete independently. ` +
      `Each is a "task" (a unit of work) or an "issue" (a bug/defect). ` +
      `Output ONLY a JSON array; each element {"title": string, "type": "task"|"issue", "requirement": string}. ` +
      `No prose, no markdown code fences.`;

    const { text } = await this.runner.runAiSession({
      runId: streamId,
      name: `Plan: ${card.title}`,
      pack: "ai-plan",
      projectId: card.projectId,
      agent: "planner",
      action: "plan",
      instruction,
      persona: agentByName.planner?.system,
      model: card.model,
      input: { title: card.title, requirement: card.requirement, type: card.type },
    });
    const items = this.parsePlan(text);
    if (items.length === 0) {
      throw new Error("The model did not return any sub-items. Activate a Claude connector and retry.");
    }

    const created: BoardCard[] = [];
    for (const item of items) {
      const child = await this.create({
        projectId: card.projectId,
        title: item.title,
        requirement: item.requirement,
        type: item.type,
        parentId: id,
        pack: card.pack,
        model: card.model as "opus" | "sonnet" | "haiku",
        maxLoops: card.maxLoops,
      });
      created.push(child);
    }
    await this.prisma.boardComment.create({
      data: {
        cardId: id,
        author: "ai",
        kind: "comment",
        body:
          `Planned ${created.length} sub-item${created.length === 1 ? "" : "s"}:\n` +
          created.map((c) => `- ${c.title}`).join("\n"),
      },
    });
    return created;
  }

  async artifacts(projectId: string): Promise<BoardCard[]> {
    const rows = await this.prisma.boardCard.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mask(r)).filter((c) => c.artifacts.length > 0);
  }

  async collectAll(projectId: string): Promise<BoardCard[]> {
    const rows = await this.prisma.boardCard.findMany({
      where: { projectId, worktree: { not: null } },
    });
    const out: BoardCard[] = [];
    for (const row of rows) {
      out.push(await this.collect(row.id));
    }
    return out.filter((c) => c.artifacts.length > 0);
  }

  async collect(id: string): Promise<BoardCard> {
    const card = await this.prisma.boardCard.findUniqueOrThrow({ where: { id } });
    if (!card.worktree) {
      return this.mask(card);
    }
    const changed = await this.worktree.changedFiles(card.worktree);
    const existing = JSON.parse(card.artifacts || "[]") as Array<{ name: string; path: string; kind: string }>;
    const artifacts = changed.length ? changed : existing;
    const bundle = await this.artifactSvc.pack(card.worktree, `${id}-${Date.now()}`);
    const plan = await this.preview.evaluate(card.worktree);
    await this.prisma.artifact.create({
      data: {
        runId: card.runId,
        projectId: card.projectId,
        cardId: id,
        name: `${card.title}.tgz`,
        path: bundle.path,
        sizeBytes: bundle.sizeBytes,
        fileCount: bundle.fileCount,
        preview: JSON.stringify(plan),
      },
    });
    const row = await this.prisma.boardCard.update({
      where: { id },
      data: { artifacts: JSON.stringify(artifacts) },
    });
    return this.mask(row);
  }

  async bundles(cardId: string) {
    const rows = await this.prisma.artifact.findMany({
      where: { cardId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      build: r.build,
      name: r.name,
      sizeBytes: r.sizeBytes,
      fileCount: r.fileCount,
      files: JSON.parse(r.files || "[]") as { name: string; path: string; kind: string }[],
      preview: JSON.parse(r.preview || "{}") as Record<string, unknown>,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  previewStart(cardId: string, artifactId?: string) {
    return this.preview.start(cardId, artifactId);
  }

  previewStatus(cardId: string) {
    return this.preview.status(cardId);
  }

  previewStop(cardId: string) {
    return this.preview.stop(cardId);
  }

  async rerunFromArtifact(id: string): Promise<BoardCard> {
    const card = await this.prisma.boardCard.findUniqueOrThrow({ where: { id } });
    const artifact = await this.prisma.artifact.findFirst({
      where: { cardId: id },
      orderBy: { createdAt: "desc" },
    });
    if (!artifact) {
      throw new BadRequestException("No saved artifact to run again. Collect artifacts first.");
    }
    if (!card.runId) {
      throw new BadRequestException("No previous run to replay.");
    }
    const run = await this.prisma.run.findUnique({ where: { id: card.runId } });
    if (!run) {
      throw new BadRequestException("The previous run no longer exists.");
    }
    const project = await this.prisma.project.findUniqueOrThrow({ where: { id: card.projectId } });
    const dest = join(project.root, ".worktrees", `${id}-replay-${Date.now()}`);
    await this.artifactSvc.unpack(artifact.path, dest);
    const workflow = workflowSchema.parse(JSON.parse(run.workflow));
    const created = await this.runner.create({
      projectId: card.projectId,
      cardId: id,
      cwd: dest,
      workflow: { ...workflow, name: `${workflow.name} (replay)` },
    });
    const row = await this.prisma.boardCard.update({
      where: { id },
      data: { runId: created.id, status: "in_process", worktree: dest },
    });
    return this.mask(row);
  }

  private parsePlan(text: string): Array<{ title: string; type: "epic" | "task" | "issue"; requirement: string }> {
    const stripped = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const start = stripped.indexOf("[");
    const end = stripped.lastIndexOf("]");
    if (start === -1 || end === -1) {
      return [];
    }
    try {
      const raw = JSON.parse(stripped.slice(start, end + 1)) as unknown[];
      return raw
        .map((r) => planItemSchema.safeParse(r))
        .filter((r): r is { success: true; data: z.infer<typeof planItemSchema> } => r.success)
        .map((r) => r.data);
    } catch {
      return [];
    }
  }

  async activity(id: string) {
    const card = await this.prisma.boardCard.findUniqueOrThrow({
      where: { id },
      select: { createdAt: true, type: true },
    });
    const runs = await this.prisma.run.findMany({
      where: { cardId: id },
      orderBy: { createdAt: "asc" },
      include: { events: { orderBy: { at: "asc" } } },
    });

    const entries: Array<{
      at: string;
      level: string;
      message: string;
      runId: string | null;
      source: "item" | "ai";
    }> = [{ at: card.createdAt.toISOString(), level: "info", message: `${card.type} created`, runId: null, source: "item" }];

    for (const run of runs) {
      entries.push({
        at: run.createdAt.toISOString(),
        level: "info",
        message: `AI started a run (${run.pack})`,
        runId: run.id,
        source: "ai",
      });
      for (const event of run.events) {
        entries.push({
          at: event.at.toISOString(),
          level: event.level,
          message: event.message,
          runId: run.id,
          source: "ai",
        });
      }
    }

    entries.sort((a, b) => a.at.localeCompare(b.at));
    return entries;
  }

  async runsForCard(id: string) {
    const card = await this.prisma.boardCard.findUnique({ where: { id }, select: { runId: true } });
    const rows = await this.prisma.run.findMany({
      where: { OR: [{ cardId: id }, ...(card?.runId ? [{ id: card.runId }] : [])] },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        pack: true,
        tokensConsumed: true,
        tokensSaved: true,
        createdAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      pack: r.pack,
      tokensConsumed: r.tokensConsumed,
      tokensSaved: r.tokensSaved,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  private mask(row: CardRow): BoardCard {
    return boardCardSchema.parse({
      id: row.id,
      projectId: row.projectId,
      title: row.title,
      requirement: row.requirement,
      type: row.type,
      parentId: row.parentId,
      pack: row.pack,
      model: row.model,
      maxLoops: row.maxLoops,
      status: row.status,
      review: row.review,
      runId: row.runId,
      worktree: row.worktree,
      artifacts: JSON.parse(row.artifacts),
      links: JSON.parse(row.links),
      order: row.order,
    });
  }

  async comments(cardId: string): Promise<BoardComment[]> {
    const rows = await this.prisma.boardComment.findMany({
      where: { cardId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => this.maskComment(r));
  }

  async addComment(cardId: string, input: CreateBoardCommentInput): Promise<BoardComment> {
    const parsed = createBoardCommentInputSchema.parse(input);
    const card = await this.prisma.boardCard.findUniqueOrThrow({ where: { id: cardId } });
    const row = await this.prisma.boardComment.create({
      data: { cardId, author: parsed.author, kind: parsed.kind, body: parsed.body },
    });
    if (parsed.kind === "approve") {
      await this.prisma.boardCard.update({ where: { id: cardId }, data: { review: "approved" } });
    } else if (parsed.kind === "request_changes") {
      await this.prisma.boardCard.update({
        where: { id: cardId },
        data: { review: "changes_requested" },
      });
      if (parsed.author === "human") {
        await this.rerunWithFeedback(card, parsed.body);
      }
    } else if (parsed.author === "human" && /@\w+/.test(parsed.body)) {
      await this.respondWithModel(card, parsed.body);
    }
    return this.maskComment(row);
  }

  async deleteComment(commentId: string): Promise<{ id: string }> {
    await this.prisma.boardComment.delete({ where: { id: commentId } });
    return { id: commentId };
  }

  private async postAiComment(cardId: string, body: string): Promise<void> {
    await this.prisma.boardComment.create({
      data: { cardId, author: "ai", kind: "comment", body },
    });
  }

  private async rerunWithFeedback(card: CardRow, feedback: string): Promise<void> {
    if (!card.runId) {
      await this.postAiComment(card.id, "There's no run to change yet. Run this task first.");
      return;
    }
    const run = await this.prisma.run.findUnique({ where: { id: card.runId } });
    if (!run) {
      return;
    }
    if (run.status === "needs_input") {
      await this.runner.resume(card.runId, feedback);
      await this.postAiComment(card.id, "Got it — resuming the run with your input.");
      return;
    }
    const recent = await this.prisma.boardComment.findMany({
      where: { cardId: card.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    const thread = recent
      .reverse()
      .map((c) => `${c.author === "ai" ? "AI" : "Developer"}: ${c.body}`)
      .join("\n");
    const lead =
      `The developer requested changes to the previous build. Address this feedback first, ` +
      `then continue the workflow to update the existing files:\n\n${feedback}` +
      (thread ? `\n\nDiscussion so far:\n${thread}` : "");

    const workflow = workflowSchema.parse(JSON.parse(run.workflow));
    workflow.inputs = { ...workflow.inputs, changeRequest: feedback };
    const firstExec = workflow.stages.findIndex(
      (s) => s.action !== "start" && s.action !== "end" && s.action !== "break",
    );
    workflow.stages = workflow.stages.map((s, i) =>
      i === firstExec
        ? { ...s, instruction: `${lead}\n\n${s.instruction ?? ""}`.trim() }
        : s,
    );
    await this.runner.create({
      projectId: card.projectId,
      cwd: run.cwd ?? undefined,
      title: card.title,
      workflow,
    });
    await this.postAiComment(card.id, "On it — re-running this task to address your requested changes.");
  }

  private async respondWithModel(card: CardRow, humanBody: string): Promise<void> {
    const children = await this.prisma.boardCard.findMany({
      where: { parentId: card.id },
      select: { title: true },
    });
    const recent = await this.prisma.boardComment.findMany({
      where: { cardId: card.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
    const pausedRun = card.runId
      ? await this.prisma.run.findUnique({ where: { id: card.runId } })
      : null;
    const question = pausedRun?.status === "needs_input" ? pausedRun.question : null;

    const discussion = recent
      .reverse()
      .map((c) => `${c.author === "ai" ? "You" : "Developer"}: ${c.body}`)
      .join("\n");

    const instruction =
      `A developer mentioned you in a comment on this ${card.type}.\n` +
      `Title: ${card.title}\n` +
      (card.requirement ? `Requirement: ${card.requirement}\n` : "") +
      (children.length ? `Sub-items:\n${children.map((c) => `- ${c.title}`).join("\n")}\n` : "") +
      (discussion ? `Recent discussion:\n${discussion}\n` : "") +
      (question
        ? `The workflow run is paused and asked: "${question}". Give a clear decision/answer so it can continue.\n`
        : "") +
      `The developer's comment: ${humanBody}\n` +
      `Reply concisely in the thread: answer the question or state what you will do. If a decision is needed to unblock the run, state it directly.`;

    let text = "";
    try {
      const res = await this.runner.runAiSession({
        name: `@model on ${card.title}`,
        pack: "ai-comment",
        projectId: card.projectId,
        agent: "board-assistant",
        action: "respond",
        instruction,
        persona: BOARD_ASSISTANT_PERSONA,
        model: card.model,
        input: {},
      });
      text = res.text.trim();
    } catch {
      text = "I could not respond right now. Activate a Claude connector and mention me again.";
    }
    if (!text) {
      return;
    }
    await this.prisma.boardComment.create({
      data: { cardId: card.id, author: "ai", kind: "comment", body: text },
    });
    if (question && card.runId) {
      await this.runner.resume(card.runId, text);
    }
  }

  private maskComment(row: {
    id: string;
    cardId: string;
    author: string;
    kind: string;
    body: string;
    createdAt: Date;
  }): BoardComment {
    return boardCommentSchema.parse({
      id: row.id,
      cardId: row.cardId,
      author: row.author,
      kind: row.kind,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
    });
  }

  async link(id: string, targetId: string): Promise<BoardCard> {
    if (id === targetId) {
      throw new BadRequestException("An item cannot be linked to itself.");
    }
    const [a, b] = await Promise.all([
      this.prisma.boardCard.findUniqueOrThrow({ where: { id } }),
      this.prisma.boardCard.findUniqueOrThrow({ where: { id: targetId } }),
    ]);
    await Promise.all([
      this.prisma.boardCard.update({
        where: { id },
        data: { links: JSON.stringify(this.addLink(a.links, targetId)) },
      }),
      this.prisma.boardCard.update({
        where: { id: targetId },
        data: { links: JSON.stringify(this.addLink(b.links, id)) },
      }),
    ]);
    const updated = await this.prisma.boardCard.findUniqueOrThrow({ where: { id } });
    return this.mask(updated);
  }

  async unlink(id: string, targetId: string): Promise<BoardCard> {
    const [a, b] = await Promise.all([
      this.prisma.boardCard.findUniqueOrThrow({ where: { id } }),
      this.prisma.boardCard.findUnique({ where: { id: targetId } }),
    ]);
    await this.prisma.boardCard.update({
      where: { id },
      data: { links: JSON.stringify(this.removeLink(a.links, targetId)) },
    });
    if (b) {
      await this.prisma.boardCard.update({
        where: { id: targetId },
        data: { links: JSON.stringify(this.removeLink(b.links, id)) },
      });
    }
    const updated = await this.prisma.boardCard.findUniqueOrThrow({ where: { id } });
    return this.mask(updated);
  }

  private addLink(raw: string, targetId: string): string[] {
    const links = new Set<string>(JSON.parse(raw) as string[]);
    links.add(targetId);
    return [...links];
  }

  private removeLink(raw: string, targetId: string): string[] {
    return (JSON.parse(raw) as string[]).filter((l) => l !== targetId);
  }
}
