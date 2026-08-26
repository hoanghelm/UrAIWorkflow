import { promises as fs } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import AdmZip from "adm-zip";
import { marketplaceItemSchema, type MarketplaceItem } from "@vcc-workflow/schema";
import { marketplaceSeed } from "../src/modules/marketplace/marketplace.seed";
import { fetchRealContent, fetchPlugin } from "../src/modules/marketplace/remote-content";
import { agentByName, skillByName, mcpByName } from "../src/modules/catalog/builtin-blocks";
import { AUTHORED } from "./bundle-authored";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(apiRoot, "..", "..");
const bundlesRoot = path.join(apiRoot, "bundles");

const NAME_ALIAS: Record<string, string> = {
  "security-auditor": "security-reviewer",
  "test-writer": "test-engineer",
  "docs-writer": "writer",
};

interface IndexEntry {
  id: string;
  kind: string;
  name: string;
  description: string;
  author: string;
  tags: string[];
  stars: number;
  source: string;
  archive?: string;
  entries?: string[];
  members?: string[];
  mcp?: { name: string; command: string; args: string[] };
}

function frontmatter(item: MarketplaceItem): string {
  return `---\nname: ${item.name}\ndescription: ${item.description}\n---\n\n`;
}

async function repoFile(rel: string): Promise<string | null> {
  try {
    const body = await fs.readFile(path.join(repoRoot, rel), "utf8");
    return body.trim() ? body : null;
  } catch {
    return null;
  }
}

async function resolveSkill(item: MarketplaceItem): Promise<string | null> {
  if (item.source) {
    const remote = await fetchRealContent(item);
    if (remote) return remote;
  }
  const alias = NAME_ALIAS[item.name] ?? item.name;
  const block = skillByName[alias] ?? skillByName[item.name];
  if (block?.guidance) return frontmatter(item) + block.guidance.trim() + "\n";
  const repo = await repoFile(`.claude/skills/${item.name}/SKILL.md`);
  if (repo) return repo;
  return AUTHORED[item.id] ?? null;
}

async function resolveAgent(item: MarketplaceItem): Promise<string | null> {
  if (item.source) {
    const remote = await fetchRealContent(item);
    if (remote) return remote;
  }
  const alias = NAME_ALIAS[item.name] ?? item.name;
  const block = agentByName[alias] ?? agentByName[item.name];
  if (block?.system) return frontmatter(item) + block.system.trim() + "\n";
  return AUTHORED[item.id] ?? null;
}

async function resolveCommand(item: MarketplaceItem): Promise<string | null> {
  const repo = await repoFile(`.claude/commands/${item.name}.md`);
  if (repo) return repo;
  return AUTHORED[item.id] ?? null;
}

async function resolvePlugin(item: MarketplaceItem): Promise<string | null> {
  if (item.source) {
    const remote = await fetchRealContent(item);
    if (remote) return remote;
  }
  return AUTHORED[item.id] ?? `# ${item.name}\n\n${item.description}\n\nSource: ${item.source || "n/a"}\n`;
}

function mcpConfig(item: MarketplaceItem): { name: string; command: string; args: string[] } {
  const block = mcpByName[item.name];
  const cfg = block?.config as { command?: string; args?: string[] } | undefined;
  return {
    name: item.name,
    command: cfg?.command ?? "npx",
    args: cfg?.args ?? ["-y", item.install || item.name],
  };
}

function targetPath(kind: string, name: string): { entry: string; fromContent: boolean } {
  switch (kind) {
    case "skill":
      return { entry: `.claude/skills/${name}/SKILL.md`, fromContent: true };
    case "agent":
      return { entry: `.claude/agents/${name}.md`, fromContent: true };
    case "command":
      return { entry: `.claude/commands/${name}.md`, fromContent: true };
    case "hook":
      return { entry: `.claude/hooks/${name}.sh`, fromContent: true };
    case "plugin":
      return { entry: `.claude/plugins/${name}/README.md`, fromContent: true };
    default:
      return { entry: "", fromContent: false };
  }
}

async function main() {
  await fs.rm(bundlesRoot, { recursive: true, force: true });
  await fs.mkdir(bundlesRoot, { recursive: true });

  const items = marketplaceSeed.map((s) => marketplaceItemSchema.parse(s));
  const index: IndexEntry[] = [];
  const gaps: string[] = [];

  for (const item of items) {
    const base = {
      id: item.id,
      kind: item.kind,
      name: item.name,
      description: item.description,
      author: item.author,
      tags: item.tags,
      stars: item.stars,
      source: item.source,
    };

    if (item.kind === "template") {
      index.push({ ...base, members: item.bundle });
      continue;
    }
    if (item.kind === "mcp") {
      index.push({ ...base, mcp: mcpConfig(item) });
      continue;
    }

    if (item.source) {
      const pluginFiles = await fetchPlugin(item.source);
      if (pluginFiles) {
        const zip = new AdmZip();
        const entries: string[] = [];
        for (const f of pluginFiles) {
          const targetEntry = `.claude/plugins/${item.name}/${f.path}`;
          zip.addFile(targetEntry, Buffer.from(f.content, "utf8"));
          entries.push(targetEntry);
        }
        const previewRank = (p: string) =>
          p.endsWith(`/skills/${item.name}/SKILL.md`)
            ? 0
            : /\/README\.md$/i.test(p)
              ? 1
              : p.endsWith(".claude-plugin/plugin.json")
                ? 2
                : 3;
        entries.sort((a, b) => previewRank(a) - previewRank(b));
        const archive = `${item.id}.zip`;
        zip.writeZip(path.join(bundlesRoot, archive));
        index.push({ ...base, kind: "plugin", archive, entries });
        console.log(
          `plugin ${item.id.padEnd(22)} ${String(pluginFiles.length).padStart(3)} files -> ${archive}`,
        );
        continue;
      }
    }

    let content: string | null = null;
    if (item.kind === "skill") content = await resolveSkill(item);
    else if (item.kind === "agent") content = await resolveAgent(item);
    else if (item.kind === "command") content = await resolveCommand(item);
    else if (item.kind === "hook") content = AUTHORED[item.id] ?? null;
    else if (item.kind === "plugin") content = await resolvePlugin(item);

    if (!content) {
      gaps.push(`${item.id} (${item.kind})`);
      content = frontmatter(item) + item.description + "\n";
    }

    const { entry } = targetPath(item.kind, item.name);
    const zip = new AdmZip();
    zip.addFile(entry, Buffer.from(content, "utf8"));
    const archive = `${item.id}.zip`;
    zip.writeZip(path.join(bundlesRoot, archive));

    index.push({ ...base, archive, entries: [entry] });
    console.log(`ok  ${item.id.padEnd(24)} ${String(content.length).padStart(6)}b -> ${archive}`);
  }

  await fs.writeFile(path.join(bundlesRoot, "index.json"), JSON.stringify(index, null, 2), "utf8");
  console.log(`\nwrote ${index.length} bundles to ${bundlesRoot}`);
  if (gaps.length) {
    console.log(`gaps (fell back to description): ${gaps.join(", ")}`);
  }
}

void main();
