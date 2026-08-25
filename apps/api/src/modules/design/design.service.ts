import { Injectable } from "@nestjs/common";
import {
  createDesignInputSchema,
  createDesignArtifactInputSchema,
  designFormatForKind,
  type CreateDesignInput,
  type CreateDesignArtifactInput,
  type Design,
  type DesignArtifact,
  type DesignFormat,
  type DesignKind,
  type DesignVersion,
  type UpdateDesignArtifactInput,
} from "@vcc-workflow/schema";
import { PrismaService } from "../../prisma/prisma.service";
import { AiService } from "../ai/ai.service";
import { buildDesignGuidance, designWorkflowViews, type DesignWorkflowView } from "./design-workflow";

interface DesignRow {
  id: string;
  projectId: string;
  name: string;
  description: string;
  createdAt: Date;
}

interface ArtifactRow {
  id: string;
  designId: string;
  kind: string;
  title: string;
  format: string;
  content: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface VersionRow {
  id: string;
  artifactId: string;
  build: number;
  content: string;
  createdAt: Date;
}

@Injectable()
export class DesignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  private maskDesign(row: DesignRow, artifactCount: number): Design {
    return {
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt.toISOString(),
      artifactCount,
    };
  }

  private maskArtifact(row: ArtifactRow): DesignArtifact {
    return {
      id: row.id,
      designId: row.designId,
      kind: row.kind as DesignKind,
      title: row.title,
      format: row.format as DesignArtifact["format"],
      content: row.content,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private maskVersion(row: VersionRow): DesignVersion {
    return {
      id: row.id,
      artifactId: row.artifactId,
      build: row.build,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
    };
  }

  workflows(): DesignWorkflowView[] {
    return designWorkflowViews();
  }

  async generatePreview(
    kind: DesignKind,
    requirement: string,
    context = "",
    model?: "opus" | "sonnet" | "haiku",
    streamId?: string,
  ): Promise<{ content: string; format: DesignFormat; summary: string }> {
    const format = designFormatForKind(kind);
    const result = await this.ai.generate({
      kind,
      requirement,
      context,
      model,
      streamId,
      guidance: buildDesignGuidance(kind),
    });
    const obj = (result.artifact ?? {}) as { html?: string; mermaid?: string };
    const content = format === "mermaid" ? (obj.mermaid ?? "") : (obj.html ?? "");
    return { content, format, summary: result.summary };
  }

  async createDesign(input: CreateDesignInput): Promise<Design> {
    const parsed = createDesignInputSchema.parse(input);
    const row = await this.prisma.design.create({
      data: { projectId: parsed.projectId, name: parsed.name, description: parsed.description },
    });
    return this.maskDesign(row, 0);
  }

  async designs(projectId: string): Promise<Design[]> {
    const rows = await this.prisma.design.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { artifacts: true } } },
    });
    return rows.map((r) => this.maskDesign(r, r._count.artifacts));
  }

  async design(id: string): Promise<Design> {
    const row = await this.prisma.design.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { artifacts: true } } },
    });
    return this.maskDesign(row, row._count.artifacts);
  }

  async renameDesign(id: string, name: string, description?: string): Promise<Design> {
    const row = await this.prisma.design.update({
      where: { id },
      data: { name, ...(description !== undefined ? { description } : {}) },
      include: { _count: { select: { artifacts: true } } },
    });
    return this.maskDesign(row, row._count.artifacts);
  }

  async deleteDesign(id: string): Promise<{ id: string }> {
    await this.prisma.design.delete({ where: { id } });
    return { id };
  }

  async artifacts(designId: string): Promise<DesignArtifact[]> {
    const rows = await this.prisma.designArtifact.findMany({
      where: { designId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => this.maskArtifact(r));
  }

  async artifact(id: string): Promise<DesignArtifact> {
    const row = await this.prisma.designArtifact.findUniqueOrThrow({ where: { id } });
    return this.maskArtifact(row);
  }

  async createArtifact(input: CreateDesignArtifactInput): Promise<DesignArtifact> {
    const parsed = createDesignArtifactInputSchema.parse(input);
    const format = designFormatForKind(parsed.kind);
    const row = await this.prisma.designArtifact.create({
      data: {
        designId: parsed.designId,
        kind: parsed.kind,
        title: parsed.title,
        format,
        content: parsed.content,
        version: 1,
      },
    });
    if (parsed.content) {
      await this.prisma.designVersion.create({
        data: { artifactId: row.id, build: 1, content: parsed.content },
      });
    }
    return this.maskArtifact(row);
  }

  async updateArtifact(id: string, input: UpdateDesignArtifactInput): Promise<DesignArtifact> {
    const current = await this.prisma.designArtifact.findUniqueOrThrow({ where: { id } });
    const data: { title?: string; content?: string; version?: number } = {};
    if (input.title !== undefined) {
      data.title = input.title;
    }
    if (input.content !== undefined && input.content !== current.content) {
      const nextBuild = current.version + 1;
      data.content = input.content;
      data.version = nextBuild;
      await this.prisma.designVersion.create({
        data: { artifactId: id, build: nextBuild, content: input.content },
      });
    }
    const row = await this.prisma.designArtifact.update({ where: { id }, data });
    return this.maskArtifact(row);
  }

  async deleteArtifact(id: string): Promise<{ id: string }> {
    await this.prisma.designArtifact.delete({ where: { id } });
    return { id };
  }

  async versions(artifactId: string): Promise<DesignVersion[]> {
    const rows = await this.prisma.designVersion.findMany({
      where: { artifactId },
      orderBy: { build: "desc" },
    });
    return rows.map((r) => this.maskVersion(r));
  }

  async restoreVersion(artifactId: string, versionId: string): Promise<DesignArtifact> {
    const version = await this.prisma.designVersion.findUniqueOrThrow({ where: { id: versionId } });
    return this.updateArtifact(artifactId, { content: version.content });
  }

  async generate(
    artifactId: string,
    requirement: string,
    persona?: string,
    streamId?: string,
    model?: "opus" | "sonnet" | "haiku",
  ): Promise<DesignArtifact> {
    const artifact = await this.prisma.designArtifact.findUniqueOrThrow({ where: { id: artifactId } });
    const context = artifact.content
      ? `Current ${artifact.kind} (${artifact.format}):\n${artifact.content}`
      : "";
    const result = await this.ai.generate({
      kind: artifact.kind,
      requirement,
      context,
      persona,
      streamId,
      model,
      guidance: buildDesignGuidance(artifact.kind as DesignKind),
    });
    const obj = (result.artifact ?? {}) as { html?: string; mermaid?: string };
    const content = artifact.format === "mermaid" ? (obj.mermaid ?? "") : (obj.html ?? "");
    if (!content) {
      return this.maskArtifact(artifact);
    }
    return this.updateArtifact(artifactId, { content });
  }
}
