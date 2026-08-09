import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Canvas,
  Empty,
  Spin,
  RobotOutlined,
  useThemeMode,
  type Node,
  type Edge,
} from "@/components/ui";
import { api } from "@/lib/api";
import { CodeChatPanel } from "./CodeChatPanel";

type Dir = "down" | "up" | "both";

function colorForFolder(folder: string): number {
  const top = folder.split("/").slice(0, 2).join("/");
  let hash = 0;
  for (let i = 0; i < top.length; i++) {
    hash = (hash * 31 + top.charCodeAt(i)) % 360;
  }
  return hash;
}

function reachable(start: string, adjacency: Map<string, string[]>): Set<string> {
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const next of adjacency.get(cur) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

export function CodeGraphTab({ projectId }: { projectId: string }) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const [focus, setFocus] = useState<string | null>(null);
  const [dir, setDir] = useState<Dir>("down");
  const [chatOpen, setChatOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["codegraph", projectId],
    queryFn: () => api.projectCodegraph(projectId),
    staleTime: 60_000,
  });

  const { down, up } = useMemo(() => {
    const down = new Map<string, string[]>();
    const up = new Map<string, string[]>();
    for (const e of data?.edges ?? []) {
      (down.get(e.source) ?? down.set(e.source, []).get(e.source)!).push(e.target);
      (up.get(e.target) ?? up.set(e.target, []).get(e.target)!).push(e.source);
    }
    return { down, up };
  }, [data]);

  const focusedSet = useMemo(() => {
    if (!focus) return null;
    if (dir === "down") return reachable(focus, down);
    if (dir === "up") return reachable(focus, up);
    return new Set([...reachable(focus, down), ...reachable(focus, up)]);
  }, [focus, dir, down, up]);

  const flow = useMemo<{ nodes: Node[]; edges: Edge[] }>(() => {
    if (!data) return { nodes: [], edges: [] };
    const text = dark ? "#e5e7eb" : "#111827";
    const nodes: Node[] = data.nodes.map((n) => {
      const h = colorForFolder(n.folder);
      const inFocus = !focusedSet || focusedSet.has(n.id);
      const isFocusRoot = focus === n.id;
      const bg = n.orphan
        ? dark ? "#26272b" : "#f1f1f2"
        : `hsl(${h} ${dark ? "36% 26%" : "70% 92%"})`;
      const border = isFocusRoot
        ? "#E8734A"
        : n.orphan ? (dark ? "#3f3f46" : "#d4d4d8") : `hsl(${h} ${dark ? "45% 42%" : "55% 70%"})`;
      return {
        id: n.id,
        position: { x: n.x, y: n.y },
        data: { label: n.label },
        style: {
          background: bg,
          border: `${isFocusRoot ? 2 : 1}px solid ${border}`,
          color: n.orphan ? (dark ? "#9ca3af" : "#6b7280") : text,
          borderRadius: 7,
          padding: "5px 9px",
          fontSize: 11,
          width: 168,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          opacity: inFocus ? 1 : 0.12,
        },
      };
    });

    const edges: Edge[] = data.edges.map((e) => {
      const inFocus = !focusedSet || (focusedSet.has(e.source) && focusedSet.has(e.target));
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        animated: e.circular || (Boolean(focusedSet) && inFocus),
        style: {
          stroke: e.circular ? "#ef4444" : inFocus ? "#E8734A" : dark ? "#3f3f46" : "#cbd5e1",
          strokeWidth: e.circular ? 1.5 : inFocus && focusedSet ? 1.5 : 1,
          opacity: inFocus ? 1 : 0.08,
        },
      };
    });
    return { nodes, edges };
  }, [data, focusedSet, focus, dark]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Spin />
        <span className="text-sm text-faint">Analyzing code…</span>
      </div>
    );
  }
  if (isError || !data) {
    return <Empty description="Could not analyze this project's code graph." />;
  }
  if (data.nodes.length === 0) {
    return <Empty description="No source modules found under this project root." />;
  }

  const dirBtn = (value: Dir, label: string) => (
    <button
      onClick={() => setDir(value)}
      className={`rounded px-2 py-1 text-xs ${
        dir === value ? "bg-accent text-white" : "bg-surface-2 text-muted hover:text-fg"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-surface-2 px-3 py-1 font-mono text-xs">
          <span className="text-fg">{data.stats.modules}</span> <span className="text-faint">modules</span>
        </span>
        <span className="rounded-full bg-surface-2 px-3 py-1 font-mono text-xs">
          <span className="text-fg">{data.stats.edges}</span> <span className="text-faint">deps</span>
        </span>
        <span className="rounded-full bg-surface-2 px-3 py-1 font-mono text-xs">
          <span className={data.stats.cycles ? "text-red-500" : "text-fg"}>{data.stats.cycles}</span>{" "}
          <span className="text-faint">cycles</span>
        </span>
        <span className="rounded-full bg-surface-2 px-3 py-1 font-mono text-xs">
          <span className={data.stats.orphans ? "text-amber-500" : "text-fg"}>{data.stats.orphans}</span>{" "}
          <span className="text-faint">orphans</span>
        </span>

        {focus ? (
          <div className="flex items-center gap-1.5">
            <span className="ml-1 font-mono text-xs text-accent">▶ {focus.split("/").pop()}</span>
            {dirBtn("down", "Uses")}
            {dirBtn("up", "Used by")}
            {dirBtn("both", "Both")}
            <button onClick={() => setFocus(null)} className="px-2 py-1 text-xs text-faint hover:text-fg">
              Clear
            </button>
          </div>
        ) : (
          <span className="text-xs text-faint">Click a node to focus its flow</span>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-faint">
            <span className="inline-block h-2 w-4 rounded" style={{ background: "#ef4444" }} /> cycle
          </span>
          <Button
            size="small"
            type={chatOpen ? "primary" : "default"}
            icon={<RobotOutlined />}
            onClick={() => setChatOpen((o) => !o)}
          >
            Ask AI
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="h-[68vh] flex-1 rounded-lg border border-line">
          <Canvas
            nodes={flow.nodes}
            edges={flow.edges}
            onNodeClick={(id) => setFocus(id)}
            onPaneClick={() => setFocus(null)}
          />
        </div>
        {chatOpen && (
          <CodeChatPanel
            projectId={projectId}
            focus={focus}
            files={focusedSet ? [focus!, ...[...focusedSet].filter((f) => f !== focus)] : []}
            outline={data.nodes.map((n) => n.id)}
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
