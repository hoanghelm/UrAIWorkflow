import { Injectable } from "@nestjs/common";
import { promises as fs } from "fs";
import * as path from "path";
import { marketplaceItemSchema, type MarketplaceItem } from "@vcc-workflow/schema";
import { PrismaService } from "../../prisma/prisma.service";
import { marketplaceSeed } from "./marketplace.seed";

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  list(): MarketplaceItem[] {
    return marketplaceSeed.map((item) => {
      const parsed = marketplaceItemSchema.parse(item);
      return { ...parsed, content: parsed.content || this.renderContent(parsed) };
    });
  }

  private titleCase(name: string): string {
    return name
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  private renderContent(item: MarketplaceItem): string {
    const title = this.titleCase(item.name);
    switch (item.kind) {
      case "skill":
      case "agent":
        return (
          `---\n` +
          `name: ${item.name}\n` +
          `description: ${item.description}\n` +
          `---\n\n` +
          `# ${title}\n\n` +
          `Complete toolkit for ${item.name} with modern tools and best practices.\n\n` +
          `## Quick start\n\n` +
          `Use this ${item.kind} when you need to ${item.description.toLowerCase()}\n\n` +
          `## Main capabilities\n\n` +
          `- Understands the task from context\n` +
          `- Applies best practices and project conventions\n` +
          `- Produces a concise, reviewable result\n`
        );
      case "command":
        return (
          `---\n` +
          `description: ${item.description}\n` +
          `---\n\n` +
          `# /${item.name}\n\n` +
          `${item.description}\n\n` +
          `Steps:\n1. Gather context\n2. Perform the action\n3. Report the result\n`
        );
      case "hook":
        return (
          `#!/usr/bin/env bash\n` +
          `# ${item.name} — ${item.description}\n\n` +
          `set -euo pipefail\n\n` +
          `# hook logic here\nexit 0\n`
        );
      case "mcp":
        return (
          `{\n` +
          `  "mcpServers": {\n` +
          `    "${item.name}": {\n` +
          `      "command": "npx",\n` +
          `      "args": ["-y", "${item.install || item.name}"]\n` +
          `    }\n` +
          `  }\n` +
          `}\n`
        );
      case "plugin":
        return `# ${title}\n\n${item.description}\n\nSource: ${item.source || "n/a"}\n`;
      case "template":
        return (
          `# ${title}\n\n${item.description}\n\n` +
          `## Includes\n\n${item.bundle.map((b) => `- ${b}`).join("\n")}\n`
        );
      default:
        return item.description;
    }
  }

  async install(projectId: string, ids: string[]): Promise<{ installed: string[] }> {
    const project = await this.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    const byId = new Map(this.list().map((item) => [item.id, item]));
    const installed: string[] = [];
    const visited = new Set<string>();
    const queue = [...ids];

    while (queue.length > 0) {
      const id = queue.shift() as string;
      if (visited.has(id)) {
        continue;
      }
      visited.add(id);
      const item = byId.get(id);
      if (!item) {
        continue;
      }
      if (item.kind === "template") {
        await this.writeTemplate(project.root, item);
        installed.push(`${item.name} (template)`);
        queue.push(...item.bundle);
        continue;
      }
      await this.writeItem(project.root, item);
      installed.push(item.name);
    }
    return { installed };
  }

  private async writeTemplate(root: string, item: MarketplaceItem): Promise<void> {
    const included = item.bundle.join("\n- ");
    await this.writeFile(
      path.join(root, ".claude", "templates", `${item.name}.md`),
      `# ${item.name}\n\n${item.description}\n\n## Includes\n- ${included}\n`,
    );
  }

  private async writeItem(root: string, item: MarketplaceItem): Promise<void> {
    const claude = path.join(root, ".claude");
    switch (item.kind) {
      case "agent":
        await this.writeFile(
          path.join(claude, "agents", `${item.name}.md`),
          this.frontmatter(item) + `\n${item.description}\n\nInstalled from the marketplace.\n`,
        );
        break;
      case "skill":
        await this.writeFile(
          path.join(claude, "skills", item.name, "SKILL.md"),
          this.frontmatter(item) + `\n${item.description}\n`,
        );
        break;
      case "command":
        await this.writeFile(
          path.join(claude, "commands", `${item.name}.md`),
          `---\ndescription: ${item.description}\n---\n\n${item.description}\n`,
        );
        break;
      case "hook":
        await this.writeFile(
          path.join(claude, "hooks", `${item.name}.sh`),
          `#!/usr/bin/env bash\n# ${item.name} — ${item.description}\nexit 0\n`,
        );
        break;
      case "plugin":
        await this.writeFile(
          path.join(claude, "plugins", item.name, "README.md"),
          `# ${item.name}\n\n${item.description}\n\nSource: ${item.source || "n/a"}\n`,
        );
        break;
      case "mcp":
        await this.addMcpServer(root, item);
        break;
    }
  }

  private frontmatter(item: MarketplaceItem): string {
    return `---\nname: ${item.name}\ndescription: ${item.description}\n---\n`;
  }

  private async writeFile(file: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content, "utf8");
  }

  private async addMcpServer(root: string, item: MarketplaceItem): Promise<void> {
    const file = path.join(root, ".mcp.json");
    let config: { mcpServers?: Record<string, unknown> } = {};
    try {
      config = JSON.parse(await fs.readFile(file, "utf8")) as { mcpServers?: Record<string, unknown> };
    } catch {
      config = {};
    }
    config.mcpServers = config.mcpServers ?? {};
    config.mcpServers[item.name] = {
      command: "npx",
      args: ["-y", item.install || item.name],
    };
    await fs.writeFile(file, JSON.stringify(config, null, 2), "utf8");
  }
}
