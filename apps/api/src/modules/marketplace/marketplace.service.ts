import { Injectable } from "@nestjs/common";
import { promises as fs } from "fs";
import * as path from "path";
import { marketplaceItemSchema, type MarketplaceItem } from "@vcc-workflow/schema";
import { PrismaService } from "../../prisma/prisma.service";
import { BundlesService } from "../bundles/bundles.service";

interface BundleMeta {
  members: string[];
  entries: string[];
  mcp: { name: string; command: string; args: string[] } | null;
}

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bundles: BundlesService,
  ) {}

  async list(): Promise<MarketplaceItem[]> {
    const rows = await this.bundles.list();
    return rows.map((row) => {
      const meta = JSON.parse(row.meta) as BundleMeta;
      let content = "";
      if (row.archive) {
        content = this.bundles.primaryContent(row.id);
      } else if (meta.mcp) {
        content = JSON.stringify(
          { mcpServers: { [meta.mcp.name]: { command: meta.mcp.command, args: meta.mcp.args } } },
          null,
          2,
        );
      } else if (meta.members.length) {
        content =
          `# ${row.name}\n\n${row.description}\n\n## Includes\n` +
          meta.members.map((m) => `- ${m}`).join("\n") +
          "\n";
      }
      const item: Record<string, unknown> = {
        id: row.id,
        kind: row.kind,
        name: row.name,
        description: row.description,
        author: row.author,
        tags: JSON.parse(row.tags),
        stars: row.stars,
        source: row.source,
        install: row.name,
        content,
      };
      if (meta.members.length) {
        item.bundle = meta.members;
      }
      return marketplaceItemSchema.parse(item);
    });
  }

  async install(projectId: string, ids: string[]): Promise<{ installed: string[] }> {
    const project = await this.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    const installed: string[] = [];
    const visited = new Set<string>();
    const queue = [...ids];

    while (queue.length > 0) {
      const id = queue.shift() as string;
      if (visited.has(id)) {
        continue;
      }
      visited.add(id);
      const entry = this.bundles.entry(id);
      if (!entry) {
        continue;
      }
      if (entry.members?.length) {
        await this.writeFile(
          path.join(project.root, ".claude", "templates", `${entry.name}.md`),
          `# ${entry.name}\n\n${entry.description}\n\n## Includes\n` +
            entry.members.map((m) => `- ${m}`).join("\n") +
            "\n",
        );
        installed.push(`${entry.name} (template)`);
        queue.push(...entry.members);
        continue;
      }
      if (entry.mcp) {
        await this.addMcpServer(project.root, entry.mcp);
        installed.push(entry.name);
        continue;
      }
      if (this.bundles.extractInto(id, project.root)) {
        installed.push(entry.name);
      }
    }
    return { installed };
  }

  private async writeFile(file: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content, "utf8");
  }

  private async addMcpServer(
    root: string,
    mcp: { name: string; command: string; args: string[] },
  ): Promise<void> {
    const file = path.join(root, ".mcp.json");
    let config: { mcpServers?: Record<string, unknown> } = {};
    try {
      config = JSON.parse(await fs.readFile(file, "utf8")) as { mcpServers?: Record<string, unknown> };
    } catch {
      config = {};
    }
    config.mcpServers = config.mcpServers ?? {};
    config.mcpServers[mcp.name] = { command: mcp.command, args: mcp.args };
    await fs.writeFile(file, JSON.stringify(config, null, 2), "utf8");
  }
}
