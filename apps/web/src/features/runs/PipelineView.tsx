import type { ReactNode } from "react";
import { RightOutlined, LoadingOutlined } from "@/components/ui";
import type { RunStageRow } from "@/lib/api";

const STATUS: Record<string, { color: string; label: string }> = {
  pending: { color: "#9aa3b2", label: "pending" },
  running: { color: "#2a6dac", label: "running" },
  passed: { color: "#1e8657", label: "passed" },
  failed: { color: "#bb3b37", label: "failed" },
  skipped: { color: "#9aa3b2", label: "skipped" },
};

export function PipelineView({
  stages,
  selectedId,
  onSelect,
  action,
}: {
  stages: RunStageRow[];
  selectedId?: string;
  onSelect?: (stageId: string) => void;
  action?: (stageId: string) => ReactNode;
}) {
  return (
    <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
      {stages.map((s, i) => {
        const st = STATUS[s.status] ?? STATUS.pending;
        const selected = selectedId === s.stageId;
        const act = action?.(s.stageId);
        return (
          <div key={s.id} className="flex items-center gap-1">
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelect?.(s.stageId)}
              className={`relative min-w-[150px] rounded-lg border-2 px-3 py-2 text-left ${
                onSelect ? "cursor-pointer" : "cursor-default"
              } ${selected ? "ring-2 ring-offset-1 ring-offset-transparent" : ""}`}
              style={{
                borderColor: st.color,
                background: `${st.color}${selected ? "26" : "12"}`,
              }}
            >
              <div
                className="flex items-center gap-1.5 text-xs font-semibold uppercase"
                style={{ color: st.color }}
              >
                {s.status === "running" && <LoadingOutlined spin />}
                {st.label}
                {s.attempts > 1 ? ` · ${s.attempts}×` : ""}
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{s.title || s.stageId}</span>
                {act && <span onClick={(e) => e.stopPropagation()}>{act}</span>}
              </div>
              <div className="text-xs text-faint">
                {s.model ? `${s.agent} · ${s.model}` : s.agent}
              </div>
            </div>
            {i < stages.length - 1 && <RightOutlined style={{ color: st.color }} />}
          </div>
        );
      })}
    </div>
  );
}
