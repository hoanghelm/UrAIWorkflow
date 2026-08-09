import { BadRequestException, Injectable, type OnModuleInit } from "@nestjs/common";
import { promises as fs } from "fs";
import { nanoid } from "nanoid";
import type { CatalogItem, ExplainCodeInput, Project } from "@vcc-workflow/schema";
import { PrismaService } from "../../prisma/prisma.service";
import { RunnerService } from "../runner/runner.service";
import { CatalogScanner } from "./catalog.scanner";
import { buildCodeGraph, codeGraphToMermaid, readCodeContext, type CodeGraph } from "./codegraph";

const CODE_EXPLAINER_PERSONA =
  "You are a senior engineer helping a developer understand an unfamiliar codebase. " +
  "You are given source files and a map of how modules depend on each other. " +
  "Explain the domain and business logic in plain language: what this area does, the key responsibilities, " +
  "the data/flow between the files, notable rules or edge cases, and how a change here would ripple. " +
  "Ground every claim in the provided files and cite file paths and function names. " +
  "Be concise and structured; do not invent code that is not shown.";
import {
  BUILTIN_AGENTS,
  BUILTIN_SKILLS,
  BUILTIN_MCPS,
  BUILTIN_TOOLS,
  BUILTIN_PLUGINS,
} from "./builtin-blocks";

const BUILTIN_PREFIX = "builtin:";

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".worktrees",
  ".next",
  ".turbo",
  ".vscode",
  ".idea",
]);

@Injectable()
export class CatalogService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scanner: CatalogScanner,
    private readonly runner: RunnerService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedBuiltins();
  }

  async seedBuiltins(): Promise<void> {
    await this.prisma.catalogItem.deleteMany({ where: { id: { startsWith: BUILTIN_PREFIX } } });
    const rows: ReturnType<CatalogService["builtinRow"]>[] = [
      ...BUILTIN_AGENTS.map((a) =>
        this.builtinRow("agent", a.name, a.title, a.description, {
          roles: a.roles,
          tools: a.tools,
          system: a.system,
        }),
      ),
      ...BUILTIN_SKILLS.map((s) =>
        this.builtinRow("skill", s.name, s.title, s.description, { guidance: s.guidance }),
      ),
      ...BUILTIN_MCPS.map((m) =>
        this.builtinRow("mcp", m.name, m.title, m.description, { config: m.config }),
      ),
      ...BUILTIN_TOOLS.map((t) => this.builtinRow("tool", t.name, t.title, t.description, {})),
      ...BUILTIN_PLUGINS.map((p) =>
        this.builtinRow("plugin", p.name, p.title, p.description, { includes: p.includes }),
      ),
    ];
    for (const row of rows) {
      await this.prisma.catalogItem.create({ data: row });
    }
  }

  private builtinRow(
    kind: string,
    name: string,
    title: string,
    description: string,
    extra: Record<string, unknown>,
  ) {
    return {
      id: `${BUILTIN_PREFIX}${kind}:${name}`,
      kind,
      name,
      scope: "template",
      path: null,
      trust: "verified",
      projectId: null,
      meta: JSON.stringify({ title, description, builtin: true, ...extra }),
    };
  }

  async folders(projectId: string): Promise<string[]> {
    const project = await this.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    try {
      const entries = await fs.readdir(project.root, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory() && !e.name.startsWith(".") && !SKIP_DIRS.has(e.name))
        .map((e) => e.name)
        .sort();
    } catch {
      return [];
    }
  }

  async registerProject(name: string, root: string, persona = "generalist"): Promise<Project> {
    const existing = await this.prisma.project.findUnique({ where: { root } });
    if (existing) {
      return { id: existing.id, name: existing.name, root: existing.root, persona: existing.persona };
    }
    const project = await this.prisma.project.create({
      data: { id: nanoid(), name, root, persona },
    });
    await this.discover(project.id);
    return { id: project.id, name: project.name, root: project.root, persona: project.persona };
  }

  async setPersona(id: string, persona: string): Promise<Project> {
    const project = await this.prisma.project.update({ where: { id }, data: { persona } });
    return { id: project.id, name: project.name, root: project.root, persona: project.persona };
  }

  async removeItem(id: string): Promise<{ id: string }> {
    const row = await this.prisma.catalogItem.findUniqueOrThrow({ where: { id } });
    if (id.startsWith(BUILTIN_PREFIX) || !row.projectId) {
      throw new BadRequestException("Built-in components can't be deleted.");
    }
    if (row.path) {
      await fs.rm(row.path, { recursive: true, force: true }).catch(() => {});
      await fs.rm(`${row.path}.md`, { force: true }).catch(() => {});
    }
    await this.prisma.catalogItem.delete({ where: { id } });
    return { id };
  }

  async removeProject(id: string): Promise<{ id: string }> {
    await this.prisma.boardCard.deleteMany({ where: { projectId: id } });
    await this.prisma.artifact.deleteMany({ where: { projectId: id } });
    await this.prisma.project.delete({ where: { id } });
    return { id };
  }

  async listProjects(): Promise<Project[]> {
    const rows = await this.prisma.project.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({ id: r.id, name: r.name, root: r.root, persona: r.persona }));
  }

  async projectSummaries(): Promise<
    Array<{ id: string; name: string; root: string; persona: string; counts: Record<string, number> }>
  > {
    const projects = await this.prisma.project.findMany({ orderBy: { createdAt: "desc" } });
    const grouped = await this.prisma.catalogItem.groupBy({
      by: ["projectId", "kind"],
      _count: { _all: true },
    });
    return projects.map((p) => {
      const counts: Record<string, number> = {};
      for (const g of grouped) {
        if (g.projectId === p.id) {
          counts[g.kind] = g._count._all;
        }
      }
      return { id: p.id, name: p.name, root: p.root, persona: p.persona, counts };
    });
  }

  async discover(projectId: string): Promise<CatalogItem[]> {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
    });
    const found = await this.scanner.scanProject(projectId, project.root);
    await this.prisma.catalogItem.deleteMany({ where: { projectId } });
    for (const item of found) {
      await this.prisma.catalogItem.create({ data: this.toRow(item) });
    }
    return found;
  }

  async codeGraph(projectId: string): Promise<CodeGraph> {
    const project = await this.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    return buildCodeGraph(project.root);
  }

  async codeGraphDiagram(
    projectId: string,
    level: "folder" | "file",
  ): Promise<{ mermaid: string }> {
    const project = await this.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    const graph = await buildCodeGraph(project.root);
    return { mermaid: codeGraphToMermaid(graph, level) };
  }

  async explain(projectId: string, input: ExplainCodeInput): Promise<{ runId: string; text: string }> {
    const project = await this.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    const files = await readCodeContext(project.root, input.files, 10, 8000);
    const outline = input.outline.slice(0, 400);

    const history = input.history
      .slice(-6)
      .map((m) => `${m.role === "user" ? "Developer" : "You"}: ${m.content}`)
      .join("\n");

    const instruction =
      (input.focus ? `The developer is focused on: ${input.focus}\n` : "") +
      (history ? `Conversation so far:\n${history}\n\n` : "") +
      `Answer this question about the code: ${input.question}`;

    const { runId, text } = await this.runner.runAiSession({
      runId: input.streamId,
      name: input.focus ? `Explain: ${input.focus.split("/").pop()}` : "Explain code",
      pack: "ai-explain",
      projectId,
      agent: "code-explainer",
      action: "explain",
      instruction,
      persona: CODE_EXPLAINER_PERSONA,
      model: "opus",
      input: { files, outline, focus: input.focus },
    });
    return { runId, text };
  }

  async projectDiagram(projectId: string): Promise<{ mermaid: string }> {
    const project = await this.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    const rows = await this.prisma.catalogItem.findMany({
      where: { projectId },
      orderBy: { name: "asc" },
    });

    const kinds = ["agent", "skill", "command", "rule", "mcp", "plugin"];
    const kindLabel: Record<string, string> = {
      agent: "Agents",
      skill: "Skills",
      command: "Commands",
      rule: "Rules",
      mcp: "MCPs",
      plugin: "Plugins",
    };

    const lines: string[] = ["flowchart LR"];
    const safe = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "_");
    lines.push(`  P["${project.name}"]:::proj`);

    for (const kind of kinds) {
      const items = rows.filter((r) => r.kind === kind);
      if (items.length === 0) {
        continue;
      }
      const kid = `K_${kind}`;
      lines.push(`  P --> ${kid}["${kindLabel[kind]} (${items.length})"]:::grp`);
      items.slice(0, 12).forEach((item, i) => {
        lines.push(`  ${kid} --> ${kid}_${i}_${safe(item.name)}["${item.name}"]`);
      });
    }

    lines.push("  classDef proj fill:#E8734A,stroke:#E8734A,color:#fff;");
    lines.push("  classDef grp fill:#6366F1,stroke:#6366F1,color:#fff;");
    return { mermaid: lines.join("\n") };
  }

  async list(projectId?: string): Promise<CatalogItem[]> {
    const rows = await this.prisma.catalogItem.findMany({
      where: projectId
        ? { OR: [{ projectId }, { id: { startsWith: BUILTIN_PREFIX } }] }
        : {},
      orderBy: { name: "asc" },
    });
    return rows.map((r) => this.fromRow(r));
  }

  private toRow(item: CatalogItem) {
    return {
      id: item.id,
      kind: item.kind,
      name: item.name,
      scope: item.scope,
      path: item.path ?? null,
      trust: item.trust,
      meta: JSON.stringify(item.meta ?? {}),
      projectId: item.projectId ?? null,
    };
  }

  private fromRow(row: {
    id: string;
    kind: string;
    name: string;
    scope: string;
    path: string | null;
    trust: string;
    meta: string;
    projectId: string | null;
  }): CatalogItem {
    const meta = JSON.parse(row.meta) as Record<string, unknown>;
    return {
      id: row.id,
      kind: row.kind as CatalogItem["kind"],
      name: row.name,
      title: typeof meta.title === "string" ? meta.title : row.name,
      description: typeof meta.description === "string" ? meta.description : "",
      scope: row.scope as CatalogItem["scope"],
      builtin: meta.builtin === true,
      path: row.path ?? undefined,
      projectId: row.projectId ?? undefined,
      trust: row.trust as CatalogItem["trust"],
      meta,
    };
  }
}
