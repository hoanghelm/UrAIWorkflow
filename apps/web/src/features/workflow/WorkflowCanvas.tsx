import { useMemo } from "react";
import { Canvas, useThemeMode, type Edge, type Node } from "@/components/ui";
import type { RunStageRow } from "@/lib/api";

type StatusStyle = { bg: string; border: string };

const PALETTE: Record<"light" | "dark", Record<string, StatusStyle>> = {
  light: {
    pending: { bg: "#f3f4f6", border: "#d6dae2" },
    running: { bg: "#dbe8f4", border: "#b6cfe6" },
    passed: { bg: "#dcefe6", border: "#b4dcc9" },
    failed: { bg: "#f6dedc", border: "#e6b9b4" },
    skipped: { bg: "#f3f4f6", border: "#d6dae2" },
  },
  dark: {
    pending: { bg: "#1f2937", border: "#374151" },
    running: { bg: "#1e3a5f", border: "#3b6299" },
    passed: { bg: "#14432f", border: "#1f6b48" },
    failed: { bg: "#4a1f1c", border: "#7a322c" },
    skipped: { bg: "#1f2937", border: "#374151" },
  },
};

export function WorkflowCanvas({ stages }: { stages: RunStageRow[] }) {
  const { mode } = useThemeMode();

  const nodes = useMemo<Node[]>(() => {
    const palette = PALETTE[mode];
    const text = mode === "dark" ? "#e5e7eb" : "#111827";
    return stages.map((s, i) => {
      const style = palette[s.status] ?? palette.pending;
      return {
        id: s.stageId,
        position: { x: i * 200, y: 40 },
        data: { label: `${s.title || s.stageId}\n${s.agent} · ${s.model}` },
        style: {
          background: style.bg,
          border: `1px solid ${style.border}`,
          color: text,
          borderRadius: 8,
          padding: 10,
          width: 170,
          whiteSpace: "pre-line",
          fontSize: 12,
        },
      };
    });
  }, [stages, mode]);

  const edges = useMemo<Edge[]>(
    () =>
      stages.slice(1).map((s, i) => ({
        id: `${stages[i].stageId}-${s.stageId}`,
        source: stages[i].stageId,
        target: s.stageId,
      })),
    [stages],
  );

  return <Canvas nodes={nodes} edges={edges} />;
}
