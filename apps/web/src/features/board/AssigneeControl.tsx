import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { BoardCard } from "@vcc-workflow/schema";
import { api } from "@/lib/api";

export interface Assignee {
  id: string;
  name: string;
  kind: "model" | "user";
  color: string;
  short: string;
}

export const ASSIGNEES: Assignee[] = [
  { id: "opus", name: "Opus", kind: "model", color: "#7c5cff", short: "OP" },
  { id: "sonnet", name: "Sonnet", kind: "model", color: "#2A6DAC", short: "SO" },
  { id: "haiku", name: "Haiku", kind: "model", color: "#1E8657", short: "HK" },
  { id: "me", name: "Me", kind: "user", color: "#E8734A", short: "ME" },
];

export const findAssignee = (id: string | null | undefined): Assignee | null =>
  id ? ASSIGNEES.find((a) => a.id === id) ?? { id, name: id, kind: "user", color: "#8a8a84", short: id.slice(0, 2).toUpperCase() } : null;

export function AssigneeAvatar({ assignee, size = 20 }: { assignee: Assignee | null; size?: number }) {
  if (!assignee) {
    return (
      <span
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: "1px dashed var(--faint)",
          display: "inline-block",
          flex: "none",
        }}
      />
    );
  }
  return (
    <span
      title={assignee.name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: assignee.color,
        color: "#fff",
        display: "grid",
        placeItems: "center",
        fontSize: assignee.kind === "model" ? size * 0.5 : size * 0.4,
        fontWeight: 600,
        flex: "none",
        letterSpacing: assignee.kind === "user" ? ".02em" : 0,
      }}
    >
      {assignee.kind === "model" ? "◈" : assignee.short}
    </span>
  );
}

export function AssigneeControl({ card, size = 20 }: { card: BoardCard; size?: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const current = findAssignee(card.assignee);
  const key = ["board", card.projectId];

  const set = async (id: string | null) => {
    setOpen(false);
    qc.setQueryData<BoardCard[]>(key, (old) =>
      (old ?? []).map((c) => (c.id === card.id ? { ...c, assignee: id } : c)),
    );
    await api.setBoardCardAssignee(card.id, id).catch(() => {});
    await qc.invalidateQueries({ queryKey: key });
  };

  return (
    <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: 0,
          color: current ? "var(--muted)" : "var(--faint)",
          fontSize: 11.5,
          fontFamily: "inherit",
        }}
      >
        <AssigneeAvatar assignee={current} size={size} />
        <span>{current ? current.name : "Assign"}</span>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              zIndex: 61,
              minWidth: 156,
              background: "var(--card)",
              border: "1px solid var(--cardline)",
              borderRadius: 9,
              boxShadow: "0 12px 30px rgba(0,0,0,.18)",
              padding: 4,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            {ASSIGNEES.map((a) => {
              const on = card.assignee === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => set(a.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    background: on ? "var(--accsoft)" : "transparent",
                    color: "var(--ink)",
                    fontSize: 12.5,
                    fontFamily: "inherit",
                    textAlign: "left",
                  }}
                >
                  <AssigneeAvatar assignee={a} size={18} />
                  <span style={{ flex: 1 }}>{a.name}</span>
                  <span style={{ fontSize: 10, color: "var(--faint)", textTransform: "uppercase" }}>{a.kind}</span>
                </button>
              );
            })}
            {card.assignee && (
              <button
                onClick={() => set(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  border: "none",
                  borderTop: "1px solid var(--line)",
                  marginTop: 2,
                  borderRadius: 6,
                  cursor: "pointer",
                  background: "transparent",
                  color: "var(--muted)",
                  fontSize: 12.5,
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <AssigneeAvatar assignee={null} size={18} />
                <span>Unassign</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
