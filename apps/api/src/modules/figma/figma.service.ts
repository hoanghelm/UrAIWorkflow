import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { WorkflowService } from "../workflow/workflow.service";
import { RunnerService } from "../runner/runner.service";

const PACK = "screen-from-figma";

@Injectable()
export class FigmaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflows: WorkflowService,
    private readonly runner: RunnerService,
  ) {}

  async generate(
    projectId: string,
    figmaUrl: string,
    token: string,
    title?: string,
  ): Promise<{ runId: string }> {
    if (!figmaUrl.trim() || !token.trim()) {
      throw new BadRequestException("A Figma frame URL and a Figma access token are required.");
    }
    const project = await this.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    const workflow = await this.workflows.fromPack(PACK, { figmaUrl });
    workflow.mcpServers = {
      figma: {
        type: "stdio",
        command: "npx",
        args: ["-y", "figma-developer-mcp", "--stdio"],
        env: { FIGMA_API_KEY: token },
      },
    };
    const { id } = await this.runner.create({ projectId, cwd: project.root, title, workflow });
    return { runId: id };
  }
}
