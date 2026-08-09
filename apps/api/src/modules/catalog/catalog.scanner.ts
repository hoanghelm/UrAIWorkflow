import { Injectable } from "@nestjs/common";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import type { CatalogItem, ResourceKind, ResourceScope } from "@vcc-workflow/schema";

const KIND_DIRS: Array<{ dir: string; kind: ResourceKind }> = [
  { dir: "agents", kind: "agent" },
  { dir: "skills", kind: "skill" },
  { dir: "commands", kind: "command" },
  { dir: "rules", kind: "rule" },
];

@Injectable()
export class CatalogScanner {
  async scanProject(projectId: string, root: string): Promise<CatalogItem[]> {
    const items: CatalogItem[] = [];
    const claudeDir = path.join(root, ".claude");

    await this.scanClaudeDir(items, projectId, claudeDir, "project");

    const userClaudeDir = path.join(os.homedir(), ".claude");
    if (path.resolve(userClaudeDir) !== path.resolve(claudeDir)) {
      await this.scanClaudeDir(items, projectId, userClaudeDir, "user");
    }

    for (const name of await this.readJsonKeys(path.join(root, ".mcp.json"), "mcpServers")) {
      items.push({
        id: `${projectId}:mcp:${name}`,
        kind: "mcp",
        name,
        scope: "project",
        path: path.join(root, ".mcp.json"),
        projectId,
        trust: "community",
        meta: {},
      });
    }

    for (const name of await this.readPlugins(claudeDir)) {
      items.push({
        id: `${projectId}:plugin:${name}`,
        kind: "plugin",
        name,
        scope: "project",
        path: path.join(claudeDir, "plugins"),
        projectId,
        trust: "community",
        meta: {},
      });
    }

    return items;
  }

  private async scanClaudeDir(
    items: CatalogItem[],
    projectId: string,
    claudeDir: string,
    scope: ResourceScope,
  ): Promise<void> {
    const seen = new Set(items.map((i) => `${i.kind}:${i.name}`));
    for (const { dir, kind } of KIND_DIRS) {
      const target = path.join(claudeDir, dir);
      const names = await this.listNames(target);
      for (const name of names) {
        if (seen.has(`${kind}:${name}`)) {
          continue;
        }
        seen.add(`${kind}:${name}`);
        const itemPath = path.join(target, name);
        const meta =
          kind === "agent" || kind === "skill"
            ? await this.readMeta(itemPath, name, kind)
            : {};
        items.push({
          id:
            scope === "project"
              ? `${projectId}:${kind}:${name}`
              : `${projectId}:${scope}:${kind}:${name}`,
          kind,
          name,
          title: typeof meta.title === "string" ? meta.title : undefined,
          description: typeof meta.description === "string" ? meta.description : undefined,
          scope,
          path: itemPath,
          projectId,
          trust: "community",
          meta,
        });
      }
    }
  }

  private async readMeta(
    itemPath: string,
    name: string,
    kind: ResourceKind,
  ): Promise<Record<string, unknown>> {
    const raw = await this.readItemFile(itemPath, name);
    if (!raw) {
      return {};
    }
    const { frontmatter, body } = this.splitFrontmatter(raw);
    const content = body.trim().slice(0, 6000);
    const meta: Record<string, unknown> = {
      title: frontmatter.name ?? frontmatter.title ?? name,
      description: frontmatter.description ?? "",
    };
    if (kind === "agent") {
      meta.system = content;
    } else {
      meta.guidance = content;
    }
    return meta;
  }

  private async readItemFile(itemPath: string, name: string): Promise<string | null> {
    const candidates = itemPath.endsWith(".md")
      ? [itemPath]
      : [
          `${itemPath}.md`,
          path.join(itemPath, "SKILL.md"),
          path.join(itemPath, "AGENT.md"),
          path.join(itemPath, "index.md"),
          path.join(itemPath, `${name}.md`),
        ];
    for (const file of candidates) {
      try {
        return await fs.readFile(file, "utf8");
      } catch {
        continue;
      }
    }
    return null;
  }

  private splitFrontmatter(raw: string): {
    frontmatter: Record<string, string>;
    body: string;
  } {
    const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) {
      return { frontmatter: {}, body: raw };
    }
    const frontmatter: Record<string, string> = {};
    for (const line of match[1].split("\n")) {
      const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (kv) {
        frontmatter[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
      }
    }
    return { frontmatter, body: match[2] };
  }

  private async listNames(dir: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files = entries
        .filter((e) => e.isFile() && e.name.endsWith(".md"))
        .map((e) => e.name.replace(/\.md$/, ""));
      const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
      return [...new Set([...files, ...dirs])];
    } catch {
      return [];
    }
  }

  private async readJsonKeys(file: string, key: string): Promise<string[]> {
    try {
      const raw = await fs.readFile(file, "utf8");
      const parsed = JSON.parse(raw) as Record<string, Record<string, unknown>>;
      return Object.keys(parsed[key] ?? {});
    } catch {
      return [];
    }
  }

  private async readPlugins(claudeDir: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(path.join(claudeDir, "plugins"), {
        withFileTypes: true,
      });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return [];
    }
  }
}
