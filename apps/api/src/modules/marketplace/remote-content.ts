import type { MarketplaceItem } from "@vcc-workflow/schema";

const TIMEOUT_MS = 15000;

function headers(): Record<string, string> {
  const h: Record<string, string> = { "User-Agent": "vcc-workflow" };
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

async function getText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) {
      return null;
    }
    const body = await res.text();
    return body.trim() ? body : null;
  } catch {
    return null;
  }
}

async function getJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

interface Repo {
  owner: string;
  repo: string;
  branch?: string;
  subpath?: string;
}

function parseGithub(source: string): Repo | null {
  const match = source.match(
    /github\.com\/([^/#?]+)\/([^/#?]+)(?:\/(?:tree|blob)\/([^/]+)\/(.+))?/i,
  );
  if (!match) {
    return null;
  }
  return { owner: match[1], repo: match[2].replace(/\.git$/, ""), branch: match[3], subpath: match[4] };
}

function raw(repo: Repo, branch: string, filePath: string): string {
  return `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${branch}/${filePath.replace(/^\/+/, "")}`;
}

function candidatePaths(kind: string, name: string): string[] {
  switch (kind) {
    case "skill":
      return [
        `.claude/skills/${name}/SKILL.md`,
        `.openclaw/skills/${name}/SKILL.md`,
        `skills/${name}/SKILL.md`,
        `SKILL.md`,
        `README.md`,
      ];
    case "agent":
      return [`.claude/agents/${name}.md`, `agents/${name}.md`, `${name}.md`, `AGENTS.md`, `README.md`];
    case "command":
      return [`.claude/commands/${name}.md`, `commands/${name}.md`, `${name}.md`, `README.md`];
    default:
      return [`README.md`];
  }
}

function score(filePath: string, kind: string, name: string): number {
  const p = filePath.toLowerCase();
  const n = name.toLowerCase();
  if (kind === "skill") {
    if (p === `.claude/skills/${n}/skill.md`) return 100;
    if (p.endsWith(`/skills/${n}/skill.md`)) return 90;
    if (p.endsWith(`/${n}/skill.md`)) return 80;
    if (p.endsWith("skill.md")) return 40;
  } else if (kind === "agent") {
    if (p === `.claude/agents/${n}.md`) return 100;
    if (p.endsWith(`/agents/${n}.md`)) return 90;
    if (p.endsWith(`/${n}.md`)) return 60;
  } else if (kind === "command") {
    if (p.endsWith(`/commands/${n}.md`)) return 90;
    if (p.endsWith(`/${n}.md`)) return 60;
  }
  if (p.endsWith("readme.md")) return 30 - p.split("/").length;
  return 0;
}

function treeFiles(tree: unknown): string[] {
  const nodes = (tree as { tree?: Array<{ type?: string; path?: string }> })?.tree;
  if (!Array.isArray(nodes)) {
    return [];
  }
  return nodes
    .filter((t) => t.type === "blob" && typeof t.path === "string" && /\.md$/i.test(t.path))
    .map((t) => t.path as string);
}

function treeBlobs(tree: unknown): string[] {
  const nodes = (tree as { tree?: Array<{ type?: string; path?: string }> })?.tree;
  if (!Array.isArray(nodes)) {
    return [];
  }
  return nodes
    .filter((t) => t.type === "blob" && typeof t.path === "string")
    .map((t) => t.path as string);
}

const PLUGIN_DIRS = [".claude-plugin/", "agents/", "commands/", "skills/", "hooks/"];
const PLUGIN_ROOT_FILES = ["plugin.json", "README.md"];

export interface PluginFile {
  path: string;
  content: string;
}

export async function fetchPlugin(source: string): Promise<PluginFile[] | null> {
  const repo = parseGithub(source);
  if (!repo) {
    return null;
  }
  const branches = repo.branch ? [repo.branch] : ["main", "master"];
  for (const branch of branches) {
    const tree = await getJson(
      `https://api.github.com/repos/${repo.owner}/${repo.repo}/git/trees/${branch}?recursive=1`,
    );
    const paths = treeBlobs(tree);
    if (!paths.length) {
      continue;
    }
    const isPlugin = paths.includes(".claude-plugin/plugin.json") || paths.includes("plugin.json");
    if (!isPlugin) {
      return null;
    }
    const wanted = paths.filter(
      (p) => PLUGIN_DIRS.some((d) => p.startsWith(d)) || PLUGIN_ROOT_FILES.includes(p),
    );
    const files: PluginFile[] = [];
    for (const p of wanted) {
      const content = await getText(raw(repo, branch, p));
      if (content != null) {
        files.push({ path: p, content });
      }
    }
    return files.length ? files : null;
  }
  return null;
}

export async function fetchRealContent(item: MarketplaceItem): Promise<string | null> {
  const repo = parseGithub(item.source || "");
  if (!repo) {
    return null;
  }
  const branches = repo.branch ? [repo.branch] : ["main", "master"];

  if (repo.subpath && /\.md$/i.test(repo.subpath)) {
    for (const branch of branches) {
      const direct = await getText(raw(repo, branch, repo.subpath));
      if (direct) {
        return direct;
      }
    }
  }

  for (const branch of branches) {
    for (const candidate of candidatePaths(item.kind, item.name)) {
      const full = repo.subpath ? `${repo.subpath.replace(/\/$/, "")}/${candidate}` : candidate;
      const hit = await getText(raw(repo, branch, full));
      if (hit) {
        return hit;
      }
    }
  }

  for (const branch of branches) {
    const tree = await getJson(
      `https://api.github.com/repos/${repo.owner}/${repo.repo}/git/trees/${branch}?recursive=1`,
    );
    const files = treeFiles(tree);
    if (!files.length) {
      continue;
    }
    const scoped = repo.subpath ? files.filter((f) => f.startsWith(repo.subpath as string)) : files;
    let best: { path: string; value: number } | null = null;
    for (const file of scoped.length ? scoped : files) {
      const value = score(file, item.kind, item.name);
      if (value > 0 && (!best || value > best.value)) {
        best = { path: file, value };
      }
    }
    if (best) {
      const hit = await getText(raw(repo, branch, best.path));
      if (hit) {
        return hit;
      }
    }
  }

  return null;
}
