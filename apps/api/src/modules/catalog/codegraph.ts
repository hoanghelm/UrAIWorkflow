import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join, relative, resolve, basename, sep } from "path";

interface CruiseDependency {
  resolved: string;
  circular?: boolean;
  coreModule?: boolean;
  dependencyTypes?: string[];
}
interface CruiseModule {
  source: string;
  orphan?: boolean;
  dependencies: CruiseDependency[];
}
interface CruiseResult {
  output: unknown;
}
type CruiseFn = (paths: string[], options: Record<string, unknown>) => Promise<CruiseResult>;

const loadCruise = new Function(
  "return import('dependency-cruiser')",
) as () => Promise<{ cruise: CruiseFn }>;

export interface CodeGraphNode {
  id: string;
  label: string;
  folder: string;
  orphan: boolean;
  x: number;
  y: number;
}
export interface CodeGraphEdge {
  id: string;
  source: string;
  target: string;
  circular: boolean;
}
export interface CodeGraph {
  nodes: CodeGraphNode[];
  edges: CodeGraphEdge[];
  stats: { modules: number; edges: number; cycles: number; orphans: number; truncated: boolean };
}

const MAX_NODES = 400;
const CODE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|vue|svelte)$/;

function rel(root: string, source: string): string {
  const abs = resolve(process.cwd(), source);
  const r = relative(root, abs).replace(/\\/g, "/");
  return r.startsWith("..") ? source.replace(/\\/g, "/") : r;
}

function folderOf(id: string): string {
  const i = id.lastIndexOf("/");
  return i === -1 ? "" : id.slice(0, i);
}

function layout(nodeIds: string[], edges: CodeGraphEdge[]): Map<string, { x: number; y: number }> {
  const preds = new Map<string, string[]>();
  nodeIds.forEach((id) => preds.set(id, []));
  for (const e of edges) {
    if (preds.has(e.target) && e.source !== e.target) {
      preds.get(e.target)!.push(e.source);
    }
  }
  const layer = new Map<string, number>();
  const depth = (id: string, stack: Set<string>): number => {
    const seen = layer.get(id);
    if (seen !== undefined) return seen;
    if (stack.has(id)) return 0;
    stack.add(id);
    let d = 0;
    for (const p of preds.get(id) ?? []) {
      d = Math.max(d, depth(p, stack) + 1);
    }
    stack.delete(id);
    layer.set(id, d);
    return d;
  };
  nodeIds.forEach((id) => depth(id, new Set()));

  const perLayer = new Map<number, number>();
  const pos = new Map<string, { x: number; y: number }>();
  for (const id of [...nodeIds].sort((a, b) => (layer.get(a)! - layer.get(b)!) || a.localeCompare(b))) {
    const l = layer.get(id)!;
    const row = perLayer.get(l) ?? 0;
    perLayer.set(l, row + 1);
    pos.set(id, { x: l * 260, y: row * 84 });
  }
  return pos;
}

const EMPTY: CodeGraph = {
  nodes: [],
  edges: [],
  stats: { modules: 0, edges: 0, cycles: 0, orphans: 0, truncated: false },
};

function sanitizeId(s: string): string {
  return "n_" + s.replace(/[^a-zA-Z0-9]/g, "_");
}

function topArea(folder: string): string {
  return folder.split("/").slice(0, 2).join("/") || "(root)";
}

function folderMermaid(graph: CodeGraph): string {
  const idToFolder = new Map<string, string>();
  const folders = new Set<string>();
  for (const n of graph.nodes) {
    const f = n.folder || "(root)";
    idToFolder.set(n.id, f);
    folders.add(f);
  }
  const edges = new Set<string>();
  for (const e of graph.edges) {
    const a = idToFolder.get(e.source);
    const b = idToFolder.get(e.target);
    if (!a || !b || a === b) continue;
    edges.add(`${a}${b}`);
  }
  const groups = new Map<string, string[]>();
  for (const f of folders) {
    const t = topArea(f);
    (groups.get(t) ?? groups.set(t, []).get(t)!).push(f);
  }

  const lines = ["flowchart LR"];
  for (const [area, fs] of [...groups.entries()].sort()) {
    lines.push(`  subgraph ${sanitizeId(area)}["${area}"]`);
    for (const f of fs.sort()) {
      const label = f === area ? f : f.slice(area.length + 1) || f;
      lines.push(`    ${sanitizeId(f)}["${label}"]`);
    }
    lines.push("  end");
  }
  for (const e of edges) {
    const [a, b] = e.split("");
    lines.push(`  ${sanitizeId(a)} --> ${sanitizeId(b)}`);
  }
  return lines.join("\n");
}

function fileMermaid(graph: CodeGraph): string {
  const cap = 120;
  const nodes = graph.nodes.slice(0, cap);
  const keep = new Set(nodes.map((n) => n.id));
  const lines = ["flowchart LR"];
  for (const n of nodes) {
    lines.push(`  ${sanitizeId(n.id)}["${n.label}"]`);
  }
  for (const e of graph.edges) {
    if (keep.has(e.source) && keep.has(e.target)) {
      lines.push(`  ${sanitizeId(e.source)} --> ${sanitizeId(e.target)}`);
    }
  }
  return lines.join("\n");
}

export function codeGraphToMermaid(graph: CodeGraph, level: "folder" | "file"): string {
  if (graph.nodes.length === 0) {
    return `flowchart TB\n  N["No source modules found under this project root."]`;
  }
  return level === "file" ? fileMermaid(graph) : folderMermaid(graph);
}

export async function readCodeContext(
  root: string,
  ids: string[],
  maxFiles: number,
  maxChars: number,
): Promise<Array<{ path: string; content: string }>> {
  const rootAbs = resolve(root) + sep;
  const out: Array<{ path: string; content: string }> = [];
  for (const id of ids.slice(0, maxFiles)) {
    const abs = resolve(root, id);
    if (!abs.startsWith(rootAbs) || !existsSync(abs)) continue;
    try {
      const raw = await readFile(abs, "utf8");
      out.push({ path: id, content: raw.length > maxChars ? raw.slice(0, maxChars) + "\n…(truncated)" : raw });
    } catch {
      continue;
    }
  }
  return out;
}

export async function buildCodeGraph(root: string): Promise<CodeGraph> {
  if (!existsSync(root)) {
    return EMPTY;
  }
  const options: Record<string, unknown> = {
    exclude: { path: "node_modules|\\.d\\.ts$|dist|build|coverage|\\.git|\\.turbo|\\.next" },
    doNotFollow: { path: "node_modules" },
  };
  const tsConfig = join(root, "tsconfig.json");
  if (existsSync(tsConfig)) {
    options.tsConfig = { fileName: tsConfig };
  }

  let out: { modules: CruiseModule[] };
  try {
    const { cruise } = await loadCruise();
    const res = await cruise([root], options);
    out = (typeof res.output === "string" ? JSON.parse(res.output) : res.output) as {
      modules: CruiseModule[];
    };
  } catch {
    return EMPTY;
  }

  const modules = out.modules.filter(
    (m) => !m.source.includes("node_modules") && CODE_FILE.test(m.source),
  );
  const ids = modules.map((m) => rel(root, m.source));
  const idSet = new Set(ids);

  const edges: CodeGraphEdge[] = [];
  let cycles = 0;
  modules.forEach((m) => {
    const source = rel(root, m.source);
    for (const dep of m.dependencies) {
      if (dep.coreModule || dep.resolved.includes("node_modules")) continue;
      const target = rel(root, dep.resolved);
      if (!idSet.has(target)) continue;
      if (dep.circular) cycles += 1;
      edges.push({ id: `${source}->${target}`, source, target, circular: Boolean(dep.circular) });
    }
  });

  const orphanSet = new Set(modules.filter((m) => m.orphan).map((m) => rel(root, m.source)));
  const truncated = ids.length > MAX_NODES;
  const keep = truncated ? ids.slice(0, MAX_NODES) : ids;
  const keepSet = new Set(keep);
  const keptEdges = edges.filter((e) => keepSet.has(e.source) && keepSet.has(e.target));

  const pos = layout(keep, keptEdges);
  const nodes: CodeGraphNode[] = keep.map((id) => ({
    id,
    label: basename(id),
    folder: folderOf(id),
    orphan: orphanSet.has(id),
    x: pos.get(id)?.x ?? 0,
    y: pos.get(id)?.y ?? 0,
  }));

  return {
    nodes,
    edges: keptEdges,
    stats: {
      modules: ids.length,
      edges: edges.length,
      cycles,
      orphans: orphanSet.size,
      truncated,
    },
  };
}
