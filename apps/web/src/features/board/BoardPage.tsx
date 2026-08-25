import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { BoardCard, BoardStatus } from "@vcc-workflow/schema";
import { api, type RunRow } from "@/lib/api";
import { notify } from "@/components/ui";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { CardDetailDrawer } from "./CardDetailDrawer";
import { AssigneeControl } from "./AssigneeControl";

const TOKENS = `
.b2{--app:#f7f6f4;--rail:#14161c;--bar:#fff;--line:#e6e3dd;--card:#fff;--cardline:#e0ddd6;--ink:#14161c;--muted:#55565e;--faint:#8a8a84;--accent:#E8734A;--accsoft:rgba(232,115,74,.16);--green:#1E8657;--blue:#2A6DAC;--amber:#F59E0B;--red:#bb3b37;--railtext:#7c7f8a;--track:#eceae5;--subtask:#9aa3b2;font-family:"IBM Plex Sans",system-ui,sans-serif}
.dark .b2{--app:#0f121a;--rail:#0b0e15;--bar:#161a23;--line:#2a313d;--card:#161a23;--cardline:#2a313d;--ink:#e7eaf1;--muted:#aab2c2;--faint:#7b8698;--accsoft:rgba(232,115,74,.18);--green:#3fae7f;--blue:#7fb3e0;--amber:#e2b155;--railtext:#7b8698;--track:#1e2430;--subtask:#5b6675}
.b2 .mono{font-family:"IBM Plex Mono",ui-monospace,monospace}
.b2 button{font-family:inherit;cursor:pointer;border:none;background:none}
.b2 ::-webkit-scrollbar{width:9px;height:9px}
.b2 ::-webkit-scrollbar-thumb{background:var(--cardline);border-radius:5px}
`;

const LABEL_COLORS = [
  { bg: "#fdeceb", fg: "#8a3b38" },
  { bg: "#eef2fb", fg: "#3a4a7a" },
  { bg: "#f3ecfb", fg: "#5b3a8a" },
  { bg: "#eaf5ef", fg: "#1a6d47" },
  { bg: "#f0eeea", fg: "#55565e" },
];
const labelColor = (s: string) =>
  LABEL_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % LABEL_COLORS.length];

const LANES: { key: string; label: string; dot: string; statuses: string[] }[] = [
  { key: "todo", label: "Todo", dot: "#9aa3b2", statuses: ["todo"] },
  { key: "prog", label: "In progress", dot: "var(--blue)", statuses: ["in_process"] },
  { key: "review", label: "In review", dot: "var(--amber)", statuses: ["review"] },
  { key: "done", label: "Done", dot: "var(--green)", statuses: ["completed", "closed"] },
  { key: "cancelled", label: "Cancelled", dot: "var(--faint)", statuses: ["cancelled"] },
];

const shortId = (id: string) => `#${id.slice(-4)}`;

function runPill(status: string): { text: string; color: string } {
  if (status === "running") return { text: "RUNNING", color: "var(--blue)" };
  if (status === "needs_input") return { text: "BLOCKED", color: "var(--amber)" };
  if (status === "failed" || status === "closed") return { text: "FAILED", color: "var(--red)" };
  if (status === "done") return { text: "DONE", color: "var(--green)" };
  return { text: status.toUpperCase(), color: "var(--faint)" };
}

export function BoardPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentId = useAppSelector((s) => s.projects.currentId);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [group, setGroup] = useState<"tasks" | "all">(
    () => (localStorage.getItem("vcc-board-group") === "all" ? "all" : "tasks"),
  );
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(
    () => new Set(JSON.parse(localStorage.getItem("vcc-board-collapsed") || "[]") as string[]),
  );
  const toggleLane = (key: string) =>
    setCollapsedLanes((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      localStorage.setItem("vcc-board-collapsed", JSON.stringify([...next]));
      return next;
    });
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<"sprint" | "backlog" | "automations">("sprint");
  const [newTrigger, setNewTrigger] = useState("");
  const [newAction, setNewAction] = useState("run");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [sprintFilter, setSprintFilter] = useState<string>("all");
  const [newSprintOpen, setNewSprintOpen] = useState(false);
  const [newSprintName, setNewSprintName] = useState("");
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");

  useEffect(() => {
    if (!currentId) {
      void dispatch.projects.load();
    }
  }, [currentId, dispatch]);

  const { data: cards = [] } = useQuery({
    queryKey: ["board", currentId],
    queryFn: () => api.board(currentId as string),
    enabled: Boolean(currentId),
  });
  const { data: runs = [] } = useQuery({
    queryKey: ["runs", currentId],
    queryFn: () => api.runs(currentId as string),
    enabled: Boolean(currentId),
  });
  const runsById = useMemo(() => new Map(runs.map((r) => [r.id, r])), [runs]);
  const { data: automations = [] } = useQuery({
    queryKey: ["board-autos", currentId],
    queryFn: () => api.boardAutomations(currentId as string),
    enabled: Boolean(currentId),
  });
  const refreshAutos = () => qc.invalidateQueries({ queryKey: ["board-autos", currentId] });

  const { data: sprints = [] } = useQuery({
    queryKey: ["board-sprints", currentId],
    queryFn: () => api.boardSprints(currentId as string),
    enabled: Boolean(currentId),
  });
  const createSprint = async () => {
    if (!currentId || !newSprintName.trim()) {
      return;
    }
    const sprint = await api.createBoardSprint(currentId, newSprintName.trim());
    setNewSprintName("");
    setNewSprintOpen(false);
    setSprintFilter(sprint.id);
    await qc.invalidateQueries({ queryKey: ["board-sprints", currentId] });
  };

  const toggleAuto = async (id: string, enabled: boolean) => {
    await api.toggleBoardAutomation(id, enabled);
    await refreshAutos();
  };
  const deleteAuto = async (id: string) => {
    await api.deleteBoardAutomation(id);
    await refreshAutos();
  };
  const addAuto = async () => {
    if (!currentId || !newTrigger.trim()) {
      return;
    }
    await api.createBoardAutomation(currentId, newTrigger.trim(), newAction.trim() || "run");
    setNewTrigger("");
    await refreshAutos();
  };

  const inSprint = (c: BoardCard) => sprintFilter === "all" || c.sprintId === sprintFilter;
  const topLevel = useMemo(() => cards.filter((c) => !c.parentId && inSprint(c)), [cards, sprintFilter]);
  const visible = group === "all" ? cards.filter(inSprint) : topLevel;
  const byLane = (statuses: string[]) => visible.filter((c) => statuses.includes(c.status));
  const subtaskCount = (id: string) => cards.filter((c) => c.parentId === id).length;
  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  const createItem = async () => {
    if (!currentId || !newItemTitle.trim()) return;
    const title = newItemTitle.trim();
    setCreating(true);
    try {
      const card = await api.createBoardCard({
        projectId: currentId,
        title,
        requirement: newItemDesc.trim(),
        type: "task",
        pack: "eng-loop",
        model: "sonnet",
        maxLoops: 8,
        labels: [],
        sprintId: sprintFilter === "all" ? undefined : sprintFilter,
      });
      setNewItemTitle("");
      setNewItemDesc("");
      setNewItemOpen(false);
      await qc.invalidateQueries({ queryKey: ["board", currentId] });
      try {
        await api.planBoardCard(card.id);
        notify.success("Task created", "AI broke it into sub-tasks.");
      } catch {
        notify.info("Task created", "Add a connector to break it into sub-tasks automatically.");
      }
      await qc.invalidateQueries({ queryKey: ["board", currentId] });
    } finally {
      setCreating(false);
    }
  };

  const doneCount = topLevel.filter((c) => ["completed", "closed"].includes(c.status)).length;
  const inProg = topLevel.filter((c) => c.status === "in_process").length;
  const inReview = topLevel.filter((c) => c.status === "review").length;
  const agentShare = topLevel.filter((c) => c.runId).length;
  const gated = topLevel.filter((c) => c.review === "changes_requested").length;
  const totalTok = runs.reduce((s, r) => s + (r.tokensConsumed || 0), 0);
  const cachedTok = runs.reduce((s, r) => s + (r.tokensCached || 0), 0);

  const handToAgent = async (id: string) => {
    setBusy(id);
    try {
      await api.runBoardCard(id);
      await qc.invalidateQueries({ queryKey: ["board", currentId] });
      await qc.invalidateQueries({ queryKey: ["runs", currentId] });
    } finally {
      setBusy(null);
    }
  };

  const cancelCard = async (id: string) => {
    qc.setQueryData<BoardCard[]>(["board", currentId], (old) =>
      (old ?? []).map((c) => (c.id === id ? { ...c, status: "cancelled" } : c)),
    );
    await api.moveBoardCard(id, "cancelled", 0).catch(() => {});
    await qc.invalidateQueries({ queryKey: ["board", currentId] });
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [dragId, setDragId] = useState<string | null>(null);
  const dragCard = dragId ? cards.find((c) => c.id === dragId) ?? null : null;
  const onDragStart = (e: DragStartEvent) => setDragId(String(e.active.id));
  const onDragEnd = async (e: DragEndEvent) => {
    setDragId(null);
    const cardId = String(e.active.id);
    const laneKey = e.over ? String(e.over.id) : null;
    const lane = laneKey ? LANES.find((l) => l.key === laneKey) : undefined;
    if (!lane) {
      return;
    }
    const target = lane.statuses[0] as BoardStatus;
    const card = cards.find((c) => c.id === cardId);
    if (!card || lane.statuses.includes(card.status)) {
      return;
    }
    qc.setQueryData<BoardCard[]>(["board", currentId], (old) =>
      (old ?? []).map((c) =>
        c.id === cardId
          ? { ...c, status: target, ...(target === "todo" ? { runId: null, review: "none", worktree: null } : {}) }
          : c,
      ),
    );
    await api.moveBoardCard(cardId, target, 0).catch(() => {});
    await qc.invalidateQueries({ queryKey: ["board", currentId] });
  };

  return (
    <div
      className="b2"
      style={{ height: "100%", display: "flex", flexDirection: "column", color: "var(--ink)" }}
    >
      <style>{TOKENS}</style>

      {newItemOpen && (
        <div
          onClick={() => setNewItemOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "grid", placeItems: "center", zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 460, maxWidth: "90vw", background: "var(--card)", border: "1px solid var(--cardline)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div style={{ fontWeight: 600, fontSize: 15 }}>New item</div>
            {sprintFilter !== "all" && (
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                Added to <strong>{sprints.find((s) => s.id === sprintFilter)?.name ?? "sprint"}</strong>.
              </div>
            )}
            <input
              autoFocus
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void createItem();
                if (e.key === "Escape") setNewItemOpen(false);
              }}
              placeholder="Title"
              style={{ border: "1px solid var(--cardline)", borderRadius: 8, padding: "8px 10px", fontSize: 13.5, fontWeight: 500, background: "var(--app)", color: "var(--ink)", fontFamily: "inherit" }}
            />
            <textarea
              value={newItemDesc}
              onChange={(e) => setNewItemDesc(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void createItem();
                if (e.key === "Escape") setNewItemOpen(false);
              }}
              placeholder="Description (optional)"
              rows={4}
              style={{ border: "1px solid var(--cardline)", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "var(--app)", color: "var(--ink)", fontFamily: "inherit", resize: "vertical" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setNewItemOpen(false)}
                style={{ background: "transparent", color: "var(--muted)", border: "1px solid var(--cardline)", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={createItem}
                disabled={!newItemTitle.trim() || creating}
                style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", opacity: newItemTitle.trim() && !creating ? 1 : 0.5 }}
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          flex: "none",
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "2px 2px 12px",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          {(["sprint", "backlog", "automations"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                textTransform: "capitalize",
                padding: "6px 8px",
                border: "none",
                cursor: "pointer",
                background: "transparent",
                fontWeight: tab === t ? 600 : 400,
                color: tab === t ? "var(--ink)" : "var(--muted)",
                borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              {t}
            </button>
          ))}
        </span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {tab === "sprint" && (
            <>
              {newSprintOpen ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    autoFocus
                    value={newSprintName}
                    onChange={(e) => setNewSprintName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void createSprint();
                      if (e.key === "Escape") setNewSprintOpen(false);
                    }}
                    placeholder="Sprint name…"
                    style={{ border: "1px solid var(--cardline)", borderRadius: 6, padding: "4px 8px", fontSize: 12, background: "var(--card)", color: "var(--ink)", fontFamily: "inherit" }}
                  />
                  <button
                    onClick={createSprint}
                    disabled={!newSprintName.trim()}
                    style={{ background: "var(--accent)", color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 12, border: "none", cursor: "pointer", opacity: newSprintName.trim() ? 1 : 0.5 }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setNewSprintOpen(false)}
                    style={{ background: "transparent", color: "var(--muted)", border: "none", cursor: "pointer", fontSize: 12 }}
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <select
                  value={sprintFilter}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setNewSprintOpen(true);
                    } else {
                      setSprintFilter(e.target.value);
                    }
                  }}
                  style={{ border: "1px solid var(--cardline)", borderRadius: 6, padding: "4px 8px", fontSize: 12, color: "var(--muted)", background: "var(--card)", fontFamily: "inherit" }}
                >
                  <option value="all">All sprints</option>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                  <option value="__new__">+ New sprint…</option>
                </select>
              )}
            </>
          )}
          {tab === "sprint" && (
            <select
              value={group}
              onChange={(e) => {
                const next = e.target.value as "tasks" | "all";
                setGroup(next);
                localStorage.setItem("vcc-board-group", next);
              }}
              style={{
                border: "1px solid var(--cardline)",
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: 12,
                color: "var(--muted)",
                background: "var(--card)",
                fontFamily: "inherit",
              }}
            >
              <option value="tasks">High-level tasks</option>
              <option value="all">All items</option>
            </select>
          )}
          <button
            onClick={() => setNewItemOpen(true)}
            disabled={!currentId || creating}
            style={{ background: "var(--accent)", color: "#fff", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", opacity: !currentId ? 0.5 : 1 }}
          >
            {creating ? "Creating…" : "+ New item"}
          </button>
        </span>
      </div>

      {!currentId ? (
          <div style={{ flex: 1, display: "grid", placeItems: "center", color: "var(--faint)" }}>
            Select a workspace to see its board.
          </div>
        ) : tab === "sprint" ? (
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragId(null)}>
          <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 14, paddingTop: 6, overflow: "hidden" }}>
            {LANES.map((lane) => {
              const laneCards = byLane(lane.statuses);
              if (collapsedLanes.has(lane.key)) {
                return (
                  <div key={lane.key} style={{ flex: "none", width: 40, display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
                    <button
                      onClick={() => toggleLane(lane.key)}
                      title={`Expand ${lane.label}`}
                      style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 22, border: "none", background: "transparent", cursor: "pointer", color: "var(--faint)", fontSize: 13 }}
                    >
                      »
                    </button>
                    <button
                      onClick={() => toggleLane(lane.key)}
                      title={`Expand ${lane.label}`}
                      style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingTop: 12, border: "1px solid var(--cardline)", borderRadius: 8, background: "var(--card)", cursor: "pointer", color: "var(--muted)" }}
                    >
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: lane.dot, flex: "none" }} />
                      <span className="mono" style={{ fontSize: 12, color: "var(--faint)" }}>{laneCards.length}</span>
                      <span style={{ writingMode: "vertical-rl", fontWeight: 600, fontSize: 12.5, letterSpacing: ".02em", marginTop: 4 }}>{lane.label}</span>
                    </button>
                  </div>
                );
              }
              return (
                <div key={lane.key} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 2px" }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: lane.dot }} />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{lane.label}</span>
                    <span className="mono" style={{ fontSize: 12, color: "var(--faint)" }}>
                      {laneCards.length}
                    </span>
                    <button
                      onClick={() => toggleLane(lane.key)}
                      title={`Collapse ${lane.label}`}
                      style={{ marginLeft: "auto", border: "none", background: "transparent", cursor: "pointer", color: "var(--faint)", fontSize: 13, lineHeight: 1 }}
                    >
                      «
                    </button>
                  </div>
                  <DroppableLane laneKey={lane.key}>
                    {laneCards.map((c) => (
                      <Card
                        key={c.id}
                        card={c}
                        run={c.runId ? runsById.get(c.runId) : undefined}
                        subtasks={group === "tasks" ? subtaskCount(c.id) : 0}
                        parentTitle={c.parentId ? cardById.get(c.parentId)?.title : undefined}
                        onOpenParent={c.parentId ? () => setDetailId(c.parentId as string) : undefined}
                        busy={busy === c.id}
                        onHand={() => handToAgent(c.id)}
                        onOpen={(rid) => navigate(`/repo/${rid}`)}
                        onDetail={() => setDetailId(c.id)}
                        onCancel={() => cancelCard(c.id)}
                      />
                    ))}
                    {laneCards.length === 0 && (
                      <div
                        style={{
                          border: "1px dashed var(--cardline)",
                          borderRadius: 9,
                          padding: 14,
                          fontSize: 12,
                          color: "var(--faint)",
                          textAlign: "center",
                        }}
                      >
                        No items
                      </div>
                    )}
                  </DroppableLane>
                </div>
              );
            })}

            <aside
              style={{
                width: 250,
                flex: "none",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                borderLeft: "1px solid var(--line)",
                paddingLeft: 16,
                overflowY: "auto",
              }}
            >
              <Panel title="SPRINT">
                <Row a={`${topLevel.length} items`} b={`${doneCount} done`} />
                <Bar
                  segments={[
                    { w: doneCount, c: "var(--green)" },
                    { w: inProg, c: "var(--blue)" },
                    { w: inReview, c: "var(--amber)" },
                  ]}
                  total={Math.max(topLevel.length, 1)}
                />
              </Panel>

              <Panel title="AGENT SHARE">
                <div style={{ fontWeight: 600, fontSize: 22 }}>
                  {agentShare} <span style={{ fontSize: 13, fontWeight: 400, color: "var(--faint)" }}>of {topLevel.length} items</span>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>
                  Handed to a workflow. {gated} needed a human gate, 0 reverted.
                </div>
                <div className="mono" style={{ fontWeight: 500, fontSize: 12, color: "var(--green)" }}>
                  {Math.round(totalTok / 1000)}k tok · {Math.round(cachedTok / 1000)}k cached
                </div>
              </Panel>

              <Panel title="BOARD AUTOMATIONS">
                {automations.length === 0 && (
                  <div style={{ fontSize: 12, color: "var(--faint)" }}>None yet.</div>
                )}
                {automations.slice(0, 4).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => toggleAuto(a.id, !a.enabled)}
                    style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--muted)", textAlign: "left", border: "none", background: "transparent", cursor: "pointer" }}
                  >
                    <Toggle on={a.enabled} />
                    <span>{autoLabel(a)}</span>
                  </button>
                ))}
                <button
                  onClick={() => setTab("automations")}
                  style={{ alignSelf: "flex-start", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "var(--accent)" }}
                >
                  Manage automations
                </button>
              </Panel>
            </aside>
          </div>
          <DragOverlay dropAnimation={null}>
            {dragCard ? (
              <div
                className="b2"
                style={{ width: 260, background: "var(--card)", border: "1px solid var(--accent)", borderRadius: 9, padding: 12, boxShadow: "0 12px 30px rgba(0,0,0,.22)", cursor: "grabbing", color: "var(--ink)" }}
              >
                <div className="mono" style={{ fontSize: 11, color: "var(--faint)", marginBottom: 4 }}>{shortId(dragCard.id)}</div>
                <div style={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.3 }}>{dragCard.title}</div>
              </div>
            ) : null}
          </DragOverlay>
          </DndContext>
        ) : tab === "backlog" ? (
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingTop: 6, display: "flex", flexDirection: "column", gap: 8, maxWidth: 760 }}>
            {topLevel.filter((c) => c.status === "todo").length === 0 && (
              <div style={{ color: "var(--faint)", fontSize: 13 }}>Backlog is empty. Everything is in flight or done.</div>
            )}
            {topLevel
              .filter((c) => c.status === "todo")
              .map((c) => (
                <div
                  key={c.id}
                  style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--card)", border: "1px solid var(--cardline)", borderRadius: 9, padding: "10px 14px" }}
                >
                  <span className="mono" style={{ fontSize: 12, color: "var(--faint)" }}>{shortId(c.id)}</span>
                  <span style={{ fontWeight: 500, fontSize: 13.5 }}>{c.title}</span>
                  <span style={{ fontSize: 11, color: "var(--faint)" }}>{subtaskCount(c.id) > 0 ? `${subtaskCount(c.id)} sub-tasks` : ""}</span>
                  <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>{c.pack}</span>
                  <button
                    onClick={() => handToAgent(c.id)}
                    disabled={busy === c.id}
                    style={{ border: "1px solid var(--cardline)", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 500, color: "var(--accent)", background: "var(--card)", cursor: "pointer" }}
                  >
                    {busy === c.id ? "starting…" : "▸ Hand to agent"}
                  </button>
                </div>
              ))}
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingTop: 6, maxWidth: 640, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
              When a card gets a matching label, the board runs the action automatically. Triggers use{" "}
              <span className="mono">label:name</span>; the action <span className="mono">run</span> hands the task to an agent.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {automations.map((a) => (
                <div
                  key={a.id}
                  style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--card)", border: "1px solid var(--cardline)", borderRadius: 9, padding: "12px 14px" }}
                >
                  <button onClick={() => toggleAuto(a.id, !a.enabled)} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
                    <Toggle on={a.enabled} />
                  </button>
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>{autoLabel(a)}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>
                    {a.trigger} → {a.action}
                  </span>
                  <button
                    onClick={() => deleteAuto(a.id)}
                    style={{ marginLeft: "auto", border: "1px solid var(--cardline)", borderRadius: 6, padding: "4px 9px", fontSize: 11, color: "var(--red)", background: "var(--card)", cursor: "pointer" }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
              <input
                value={newTrigger}
                onChange={(e) => setNewTrigger(e.target.value)}
                placeholder="label:design"
                style={{ border: "1px solid var(--cardline)", borderRadius: 6, padding: "6px 10px", fontSize: 12.5, background: "var(--card)", color: "var(--ink)", fontFamily: "inherit", width: 160 }}
              />
              <span style={{ color: "var(--faint)" }}>→</span>
              <select
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                style={{ border: "1px solid var(--cardline)", borderRadius: 6, padding: "6px 8px", fontSize: 12.5, background: "var(--card)", color: "var(--muted)", fontFamily: "inherit" }}
              >
                <option value="run">run (hand to agent)</option>
              </select>
              <button
                onClick={addAuto}
                disabled={!newTrigger.trim()}
                style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12.5, fontWeight: 500, cursor: "pointer", opacity: newTrigger.trim() ? 1 : 0.5 }}
              >
                Add automation
              </button>
            </div>
          </div>
        )}

      {currentId && (
        <CardDetailDrawer
          cardId={detailId}
          cards={cards}
          runs={runs}
          projectId={currentId}
          onClose={() => setDetailId(null)}
          onOpenCard={(id) => setDetailId(id)}
        />
      )}
    </div>
  );
}

function DroppableLane({ laneKey, children }: { laneKey: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: laneKey });
  return (
    <div
      ref={setNodeRef}
      style={{ display: "flex", flexDirection: "column", gap: 9, overflowY: "auto", paddingRight: 2, flex: 1, minHeight: 0, borderRadius: 8, background: isOver ? "var(--accsoft)" : "transparent" }}
    >
      {children}
    </div>
  );
}

function Card({
  card,
  run,
  subtasks = 0,
  parentTitle,
  onOpenParent,
  busy,
  onHand,
  onOpen,
  onDetail,
  onCancel,
}: {
  card: BoardCard;
  run?: RunRow;
  subtasks?: number;
  parentTitle?: string;
  onOpenParent?: () => void;
  busy: boolean;
  onHand: () => void;
  onOpen: (runId: string) => void;
  onDetail: () => void;
  onCancel?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  const dragStyle = { opacity: isDragging ? 0.4 : 1 };
  const isAgent = Boolean(card.runId);
  const isSubtask = Boolean(card.parentId);
  const stages = run?.stages ?? [];
  const passed = stages.filter((s) => s.status === "passed").length;
  const current = stages.find((s) => s.status !== "passed" && s.status !== "skipped");
  const blocked = run?.status === "needs_input";
  const border = blocked ? "#f0d9a8" : isAgent && run?.status === "running" ? "#c3d8ee" : "var(--cardline)";
  const bg = blocked ? "rgba(245,158,11,.06)" : "var(--card)";

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="button"
      onClick={onDetail}
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderLeft: isSubtask ? "3px solid var(--subtask)" : `1px solid ${border}`,
        borderRadius: 9,
        padding: 12,
        marginLeft: isSubtask ? 12 : 0,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: "grab",
        ...dragStyle,
      }}
    >
      {isSubtask && parentTitle && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenParent?.();
          }}
          style={{
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            maxWidth: "100%",
            fontSize: 10.5,
            fontWeight: 500,
            color: "var(--muted)",
            background: "var(--track)",
            border: "none",
            borderRadius: 6,
            padding: "2px 7px",
            cursor: "pointer",
          }}
          title={`Sub-task of ${parentTitle}`}
        >
          <span style={{ flex: "none" }}>↳</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{parentTitle}</span>
        </button>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="mono" style={{ fontSize: 12, color: "var(--faint)" }}>
          {shortId(card.id)}
        </span>
        {isAgent && run && (
          <span
            className="mono"
            style={{
              marginLeft: "auto",
              fontWeight: 500,
              fontSize: 10.5,
              color: runPill(run.status).color,
              border: `1px solid ${runPill(run.status).color}`,
              borderRadius: 10,
              padding: "1px 7px",
            }}
          >
            {runPill(run.status).text}
          </span>
        )}
      </div>

      <div style={{ fontWeight: 500, fontSize: 13.5, lineHeight: 1.45 }}>{card.title}</div>

      {subtasks > 0 && (
        <div className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>
          {subtasks} sub-task{subtasks === 1 ? "" : "s"}
        </div>
      )}

      {(card.labels.length > 0 || card.type) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {card.labels.map((l) => {
            const c = labelColor(l);
            return (
              <span key={l} style={{ borderRadius: 11, background: c.bg, color: c.fg, padding: "2px 8px", fontWeight: 500, fontSize: 11 }}>
                {l}
              </span>
            );
          })}
          <span style={{ borderRadius: 11, background: "var(--track)", color: "var(--muted)", padding: "2px 8px", fontWeight: 500, fontSize: 11 }}>
            {card.pack}
          </span>
        </div>
      )}

      {isAgent && !isSubtask && stages.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 2, height: 5, borderRadius: 3, overflow: "hidden" }}>
            {stages.map((s) => (
              <span
                key={s.id}
                style={{
                  flex: 1,
                  background:
                    s.status === "passed"
                      ? "var(--green)"
                      : s === current
                        ? "var(--blue)"
                        : "var(--track)",
                }}
              />
            ))}
          </div>
          <div className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>
            {current ? current.title || current.stageId : "complete"} · {passed} of {stages.length}
          </div>
        </>
      )}

      {blocked && run?.question && (
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--amber)" }}>Waiting on you: {run.question}</div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
        {isAgent ? (
          <>
            <span
              style={{ width: 20, height: 20, borderRadius: 6, background: "var(--accent)", color: "#fff", display: "grid", placeItems: "center", fontSize: 10 }}
            >
              ◈
            </span>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{run?.pack ?? "agent"}</span>
            <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--faint)" }}>
              {run ? `${Math.round((run.tokensConsumed || 0) / 1000)}k tok` : ""}
            </span>
          </>
        ) : (
          <AssigneeControl card={card} />
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {onCancel && !["cancelled", "completed", "closed"].includes(card.status) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            title="Cancel this task"
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--faint)", fontSize: 11, padding: "4px 2px" }}
          >
            ✕ Cancel
          </button>
        )}
        {!isAgent && card.status === "todo" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onHand();
            }}
            style={{ marginLeft: "auto", border: "1px solid var(--cardline)", borderRadius: 6, padding: "4px 10px", fontWeight: 500, fontSize: 11, color: "var(--accent)", background: "var(--card)", cursor: "pointer" }}
          >
            {busy ? "starting…" : "▸ Hand to agent"}
          </button>
        )}
        {(blocked || card.status === "review") && card.runId && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(card.runId as string); }}
            style={{ marginLeft: "auto", background: blocked ? "var(--ink)" : "var(--green)", color: blocked ? "var(--app)" : "#fff", borderRadius: 6, padding: "4px 12px", fontWeight: 500, fontSize: 11.5 }}
          >
            {blocked ? "Answer" : "Review"}
          </button>
        )}
        {card.status !== "todo" && !blocked && card.status !== "review" && card.runId && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(card.runId as string); }}
            style={{ marginLeft: "auto", border: "1px solid var(--cardline)", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "var(--muted)", background: "var(--card)" }}
          >
            Open
          </button>
        )}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <div className="mono" style={{ fontWeight: 600, fontSize: 11, letterSpacing: ".1em", color: "var(--muted)" }}>
        {title}
      </div>
      <div
        style={{ background: "var(--card)", border: "1px solid var(--cardline)", borderRadius: 9, padding: 13, display: "flex", flexDirection: "column", gap: 9 }}
      >
        {children}
      </div>
    </div>
  );
}

function Row({ a, b }: { a: string; b: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--muted)" }}>
      <span>{a}</span>
      <span style={{ color: "var(--ink)", fontWeight: 500 }}>{b}</span>
    </div>
  );
}

function Bar({ segments, total }: { segments: { w: number; c: string }[]; total: number }) {
  return (
    <div style={{ height: 7, borderRadius: 4, background: "var(--track)", overflow: "hidden", display: "flex" }}>
      {segments.map((s, i) => (
        <span key={i} style={{ width: `${(s.w / total) * 100}%`, background: s.c }} />
      ))}
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      style={{ width: 28, height: 16, borderRadius: 9, flex: "none", position: "relative", display: "inline-block", background: on ? "var(--green)" : "var(--cardline)" }}
    >
      <span
        style={{ position: "absolute", top: 2, left: on ? undefined : 2, right: on ? 2 : undefined, width: 12, height: 12, borderRadius: "50%", background: "#fff" }}
      />
    </span>
  );
}

function autoLabel(a: { trigger: string; action: string }): string {
  const t = a.trigger.startsWith("label:") ? `Labeled ${a.trigger.slice(6)}` : a.trigger;
  const act = a.action === "run" ? "run the task" : a.action;
  return `${t} → ${act}`;
}
