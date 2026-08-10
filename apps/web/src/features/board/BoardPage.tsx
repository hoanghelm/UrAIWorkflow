import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { BoardCard, BoardStatus } from "@vcc-workflow/schema";
import {
  Button,
  Drawer,
  Empty,
  Input,
  TextArea,
  Modal,
  Select,
  Tag,
  RunStatusPill,
  notify,
  PageHeader,
  ProjectOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  CloseOutlined,
  DownOutlined,
  LinkOutlined,
  DeleteOutlined,
} from "@/components/ui";
import { useAiActivity } from "@/features/ai/useAiActivity";
import { AiActivityPanel } from "@/features/ai/AiActivityPanel";
import { api } from "@/lib/api";
import { usePacksQuery, useRunsQuery } from "@/lib/queries";
import { useAppSelector } from "@/store/hooks";
import { SortableCard } from "./SortableCard";
import { CardDiscussion } from "./CardDiscussion";
import { BoardPlanBuilder } from "./BoardPlanBuilder";
import { useRegisterAiBuilder } from "@/lib/activity/hooks";
import { TYPE_META, ITEM_TYPE_OPTIONS } from "./itemMeta";

const REVIEW_TAG: Record<string, { label: string; color: string }> = {
  approved: { label: "approved", color: "green" },
  changes_requested: { label: "changes requested", color: "gold" },
};

const COLUMNS: { status: BoardStatus; label: string }[] = [
  { status: "todo", label: "To Do" },
  { status: "in_process", label: "In Process" },
  { status: "review", label: "Review" },
  { status: "completed", label: "Completed" },
  { status: "closed", label: "Closed" },
];

function Column({
  status,
  label,
  count,
  children,
}: {
  status: BoardStatus;
  label: string;
  count: number;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="flex h-full min-h-0 w-72 shrink-0 flex-col rounded-lg bg-surface-2 p-2">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-semibold">{label}</span>
        <span className="rounded-full bg-surface px-2 font-mono text-xs text-faint">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-md p-1 transition ${
          isOver ? "bg-accent/10 outline-dashed outline-2 outline-accent" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  actions,
  defaultOpen = true,
  children,
}: {
  title: string;
  count: number;
  actions?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-sm font-semibold text-fg"
        >
          <DownOutlined
            className={`text-[10px] text-faint transition-transform ${open ? "" : "-rotate-90"}`}
          />
          {title}
          <span className="rounded-full bg-surface-2 px-2 text-xs font-normal text-faint">
            {count}
          </span>
        </button>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
      {open && <div className="border-t border-line px-3 py-3">{children}</div>}
    </div>
  );
}

export function BoardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const currentId = useAppSelector((s) => s.projects.currentId);
  const { data: packs = [] } = usePacksQuery();
  const { data: runs = [] } = useRunsQuery(currentId ?? undefined);
  const { data: serverCards = [] } = useQuery({
    queryKey: ["board", currentId],
    queryFn: () => api.board(currentId as string),
    enabled: Boolean(currentId),
  });

  const [cards, setCards] = useState<BoardCard[]>([]);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [detailCard, setDetailCard] = useState<BoardCard | null>(null);
  const [planOpen, setPlanOpen] = useState(false);

  useRegisterAiBuilder("Plan", () => setPlanOpen(true), Boolean(currentId));

  const { data: cardActivity = [] } = useQuery({
    queryKey: ["board-activity", detailCard?.id],
    queryFn: () => api.boardCardActivity(detailCard!.id),
    enabled: Boolean(detailCard),
  });

  const { data: cardComments = [] } = useQuery({
    queryKey: ["board-comments", detailCard?.id],
    queryFn: () => api.boardComments(detailCard!.id),
    enabled: Boolean(detailCard),
  });

  const { data: cardBundles = [] } = useQuery({
    queryKey: ["board-bundles", detailCard?.id],
    queryFn: () => api.boardBundles(detailCard!.id),
    enabled: Boolean(detailCard),
  });

  const { data: cardRuns = [] } = useQuery({
    queryKey: ["board-runs", detailCard?.id],
    queryFn: () => api.boardCardRuns(detailCard!.id),
    enabled: Boolean(detailCard),
  });

  const fmtSize = (b: number) =>
    b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  const [preview, setPreview] = useState<{ status: string; url: string | null; logs: string[] } | null>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    setPreview(null);
    setPreviewing(false);
  }, [detailCard?.id]);

  const pollPreview = async (id: string) => {
    const s = await api.previewStatus(id);
    setPreview(s);
    if (s.status === "ready") {
      setPreviewing(false);
      if (s.url) window.open(s.url, "_blank", "noopener");
      return;
    }
    if (s.status === "failed") {
      setPreviewing(false);
      notify.error("Preview build failed. Check the log.");
      return;
    }
    setTimeout(() => void pollPreview(id), 1500);
  };

  const [previewArtifactId, setPreviewArtifactId] = useState<string | null>(null);
  const startPreview = async (id: string, artifactId?: string) => {
    setPreviewing(true);
    setPreviewArtifactId(artifactId ?? null);
    try {
      const s = await api.previewStart(id, artifactId);
      setPreview(s);
      setTimeout(() => void pollPreview(id), 1500);
    } catch {
      setPreviewing(false);
      notify.error("This version isn't a runnable web app.");
    }
  };

  const onReview = (state: "approved" | "changes_requested") => {
    setDetailCard((c) => (c ? { ...c, review: state } : c));
    void qc.invalidateQueries({ queryKey: ["board", currentId] });
  };

  useEffect(() => {
    if (!activeId) {
      setCards(serverCards);
    }
  }, [serverCards, activeId]);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [requirement, setRequirement] = useState("");
  const [itemType, setItemType] = useState<"epic" | "task" | "issue">("task");
  const [parentFor, setParentFor] = useState<BoardCard | null>(null);
  const [pack, setPack] = useState("eng-loop");
  const [model, setModel] = useState<"opus" | "sonnet" | "haiku">("sonnet");
  const [maxLoops, setMaxLoops] = useState(8);

  const isStageSub = (c: BoardCard) => c.id.includes("::");

  const childCountById = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of cards) {
      if (c.parentId && !isStageSub(c)) {
        m[c.parentId] = (m[c.parentId] ?? 0) + 1;
      }
    }
    return m;
  }, [cards]);

  const stageSubsById = useMemo(() => {
    const m: Record<string, BoardCard[]> = {};
    for (const c of cards) {
      if (c.parentId && isStageSub(c)) {
        (m[c.parentId] ??= []).push(c);
      }
    }
    for (const list of Object.values(m)) {
      list.sort((a, b) => a.order - b.order);
    }
    return m;
  }, [cards]);

  const childrenOf = (id: string) => cards.filter((c) => c.parentId === id);
  const parentOf = (card: BoardCard) =>
    card.parentId ? cards.find((c) => c.id === card.parentId) ?? null : null;
  const linkedCards = (card: BoardCard) =>
    card.links
      .map((id) => cards.find((c) => c.id === id))
      .filter((c): c is BoardCard => Boolean(c));
  const linkOptions = (card: BoardCard) =>
    cards
      .filter((c) => c.id !== card.id && !card.links.includes(c.id))
      .map((c) => ({ value: c.id, label: `${TYPE_META[c.type].label}: ${c.title}` }));

  const runStatusById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of runs) {
      map[r.id] = r.status;
    }
    return map;
  }, [runs]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const columnCards = (status: BoardStatus) =>
    cards
      .filter((c) => c.status === status && !isStageSub(c))
      .sort((a, b) => a.order - b.order);

  const findContainer = (id: UniqueIdentifier): BoardStatus | undefined => {
    if (COLUMNS.some((c) => c.status === id)) {
      return id as BoardStatus;
    }
    return cards.find((c) => c.id === id)?.status;
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(e.active.id);

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) {
      return;
    }
    const from = findContainer(active.id);
    const to = findContainer(over.id);
    if (!from || !to || from === to) {
      return;
    }
    setCards((prev) => prev.map((c) => (c.id === active.id ? { ...c, status: to } : c)));
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) {
      return;
    }
    const to = findContainer(over.id) ?? findContainer(active.id);
    if (!to) {
      return;
    }
    setCards((prev) => {
      let next = prev;
      if (active.id !== over.id) {
        const ids = prev.filter((c) => c.status === to).map((c) => c.id);
        const oldIndex = ids.indexOf(active.id as string);
        const newIndex = ids.indexOf(over.id as string);
        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(ids, oldIndex, newIndex);
          next = prev.map((c) =>
            c.status === to ? { ...c, order: reordered.indexOf(c.id) } : c,
          );
        }
      }
      const moved = next.find((c) => c.id === active.id);
      if (moved) {
        void api
          .moveBoardCard(active.id as string, moved.status, moved.order)
          .then(() => qc.invalidateQueries({ queryKey: ["board", currentId] }));
      }
      return next;
    });
  };

  const addCard = async () => {
    if (!currentId || !title) {
      notify.error("Title is required");
      return;
    }
    await api.createBoardCard({
      projectId: currentId,
      title,
      requirement,
      type: itemType,
      parentId: parentFor?.id,
      pack,
      model,
      maxLoops,
    });
    setOpen(false);
    setTitle("");
    setRequirement("");
    setParentFor(null);
    setItemType("task");
    void qc.invalidateQueries({ queryKey: ["board", currentId] });
  };

  const openNew = () => {
    setParentFor(null);
    setItemType("task");
    setTitle("");
    setRequirement("");
    setOpen(true);
  };

  const openSubItem = (parent: BoardCard) => {
    setParentFor(parent);
    setItemType(parent.type === "epic" ? "task" : "issue");
    setTitle("");
    setRequirement("");
    setPack(parent.pack);
    setModel(parent.model as "opus" | "sonnet" | "haiku");
    setOpen(true);
  };

  const runCard = async (id: string) => {
    const updated = await api.runBoardCard(id);
    notify.success("Run started");
    void qc.invalidateQueries({ queryKey: ["board", currentId] });
    void qc.invalidateQueries({ queryKey: ["runs", currentId] });
    if (updated.runId) {
      navigate(`/runs/${updated.runId}`);
    }
  };

  const removeCard = async (id: string) => {
    await api.deleteBoardCard(id);
    void qc.invalidateQueries({ queryKey: ["board", currentId] });
  };

  const ai = useAiActivity();
  const [running, setRunning] = useState(false);
  const runFromDetail = async (id: string) => {
    setRunning(true);
    try {
      const updated = await api.runBoardCard(id);
      setDetailCard(updated);
      notify.success("Run started");
      void qc.invalidateQueries({ queryKey: ["board", currentId] });
      void qc.invalidateQueries({ queryKey: ["runs", currentId] });
      void qc.invalidateQueries({ queryKey: ["board-activity", id] });
    } finally {
      setRunning(false);
    }
  };

  const [planning, setPlanning] = useState(false);
  const planWithAI = async (id: string) => {
    setPlanning(true);
    const streamId = ai.start("Planning sub-items");
    try {
      const children = await api.planBoardCard(id, streamId);
      notify.success(`AI planned ${children.length} sub-item${children.length === 1 ? "" : "s"}`);
      await qc.invalidateQueries({ queryKey: ["board", currentId] });
    } catch {
      notify.error("Planning needs an active Claude connector.");
    } finally {
      setPlanning(false);
      ai.stop();
    }
  };

  const [linkOpen, setLinkOpen] = useState(false);
  const linkItem = async (targetId: string) => {
    if (!detailCard) {
      return;
    }
    const updated = await api.linkBoardCard(detailCard.id, targetId);
    setDetailCard(updated);
    setLinkOpen(false);
    void qc.invalidateQueries({ queryKey: ["board", currentId] });
  };
  const unlinkItem = async (targetId: string) => {
    if (!detailCard) {
      return;
    }
    const updated = await api.unlinkBoardCard(detailCard.id, targetId);
    setDetailCard(updated);
    void qc.invalidateQueries({ queryKey: ["board", currentId] });
  };

  const active = cards.find((c) => c.id === activeId);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={<ProjectOutlined />}
        title="Board"
        subtitle="Plan work and let AI take it from to do to done."
        extra={
          <div className="flex items-center gap-2">
            <Button type="primary" icon={<PlusOutlined />} disabled={!currentId} onClick={openNew}>
              New item
            </Button>
          </div>
        }
      />

      {!currentId ? (
        <Empty description="Select a workspace to open its board." />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
            {COLUMNS.map((col) => {
              const list = columnCards(col.status);
              return (
                <Column key={col.status} status={col.status} label={col.label} count={list.length}>
                  <SortableContext
                    items={list.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {list.map((c) => (
                      <SortableCard
                        key={c.id}
                        card={c}
                        runStatus={c.runId ? runStatusById[c.runId] : undefined}
                        childCount={childCountById[c.id] ?? 0}
                        subStages={stageSubsById[c.id] ?? []}
                        onRun={() => runCard(c.id)}
                        onDelete={() => removeCard(c.id)}
                        onOpenDetail={() => setDetailCard(c)}
                      />
                    ))}
                    {list.length === 0 && activeId && (
                      <div className="rounded-md border border-dashed border-accent py-6 text-center text-xs text-accent">
                        Drop here
                      </div>
                    )}
                  </SortableContext>
                </Column>
              );
            })}
          </div>

          <DragOverlay>
            {active ? (
              <div className="w-72 rounded-lg border border-accent bg-surface p-3 shadow-lg">
                <div className="text-sm font-medium">{active.title}</div>
                <div className="mt-1 flex gap-1">
                  <Tag>{active.pack}</Tag>
                  <Tag color="blue">{active.model}</Tag>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <Modal
        title={parentFor ? `New sub-item under “${parentFor.title}”` : "New item"}
        open={open}
        onOk={addCard}
        onCancel={() => {
          setOpen(false);
          setParentFor(null);
        }}
        okText="Add"
      >
        <div className="flex flex-col gap-3 py-2">
          <Select
            value={itemType}
            options={ITEM_TYPE_OPTIONS}
            onChange={(v) => setItemType(v as "epic" | "task" | "issue")}
          />
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextArea
            rows={3}
            placeholder="Describe the requirement"
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
          />
          <Select
            value={pack}
            options={packs.map((p) => ({ label: `Workflow: ${p.name}`, value: p.name }))}
            onChange={(v) => setPack(v as string)}
          />
          <Select
            value={model}
            options={[
              { label: "Model: Best (opus)", value: "opus" },
              { label: "Model: Balanced (sonnet)", value: "sonnet" },
              { label: "Model: Fast (haiku)", value: "haiku" },
            ]}
            onChange={(v) => setModel(v as "opus" | "sonnet" | "haiku")}
          />
          <Input
            type="number"
            addonBefore="Max loops"
            value={maxLoops}
            onChange={(e) => setMaxLoops(Number(e.target.value) || 8)}
          />
        </div>
      </Modal>

      <Drawer
        title={detailCard?.title}
        placement="right"
        width={480}
        open={Boolean(detailCard)}
        onClose={() => setDetailCard(null)}
        closable={false}
        extra={
          <button
            onClick={() => setDetailCard(null)}
            className="text-faint hover:text-fg"
            aria-label="Close"
          >
            <CloseOutlined />
          </button>
        }
      >
        {detailCard && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag color={TYPE_META[detailCard.type].color}>{TYPE_META[detailCard.type].label}</Tag>
              <RunStatusPill status={detailCard.status} />
              {REVIEW_TAG[detailCard.review] && (
                <Tag color={REVIEW_TAG[detailCard.review].color}>
                  {REVIEW_TAG[detailCard.review].label}
                </Tag>
              )}
            </div>

            {parentOf(detailCard) && (
              <Button
                type="link"
                size="small"
                className="self-start px-0"
                onClick={() => setDetailCard(parentOf(detailCard)!)}
              >
                Part of {TYPE_META[parentOf(detailCard)!.type].label}: {parentOf(detailCard)!.title}
              </Button>
            )}

            {detailCard.requirement && (
              <div className="whitespace-pre-wrap break-words rounded-md border border-line bg-surface-2 p-3 text-sm leading-relaxed text-fg">
                {detailCard.requirement}
              </div>
            )}

            {(() => {
              const cardRun = detailCard.runId ? runs.find((r) => r.id === detailCard.runId) : null;
              if (cardRun?.status !== "needs_input" || !cardRun.question) {
                return null;
              }
              return (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  <div className="mb-1 font-medium text-amber-600 dark:text-amber-400">
                    Needs your input
                  </div>
                  <div className="text-fg">{cardRun.question}</div>
                  <div className="mt-1 text-xs text-faint">
                    Comment @model below to answer and continue the run.
                  </div>
                </div>
              );
            })()}

            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={running}
              onClick={() => runFromDetail(detailCard.id)}
              block
            >
              Run with AI
            </Button>

            {(detailCard.type !== "issue" || childrenOf(detailCard.id).length > 0) && (
              <Section
                title="Sub-items"
                count={childrenOf(detailCard.id).length}
                actions={
                  <>
                    {detailCard.type !== "issue" && (
                      <Button
                        type="text"
                        size="small"
                        icon={<RobotOutlined />}
                        loading={planning}
                        onClick={() => planWithAI(detailCard.id)}
                      />
                    )}
                    <Button
                      type="text"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => openSubItem(detailCard)}
                    />
                  </>
                }
              >
                {childrenOf(detailCard.id).length === 0 ? (
                  <p className="text-sm text-faint">
                    Break this down into smaller items with AI, or add one.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {childrenOf(detailCard.id).map((child) => (
                      <button
                        key={child.id}
                        onClick={() => setDetailCard(child)}
                        className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface-2 px-2 py-1.5 text-left hover:border-accent"
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Tag color={TYPE_META[child.type].color} className="shrink-0">
                            {TYPE_META[child.type].label}
                          </Tag>
                          <span className="truncate text-sm text-fg">{child.title}</span>
                        </span>
                        <RunStatusPill status={child.status} />
                      </button>
                    ))}
                  </div>
                )}
              </Section>
            )}

            <Section
              title="Linked items"
              count={linkedCards(detailCard).length}
              actions={
                <Button
                  type="text"
                  size="small"
                  icon={<LinkOutlined />}
                  onClick={() => setLinkOpen((o) => !o)}
                />
              }
            >
              {linkOpen && (
                <Select
                  showSearch
                  autoFocus
                  placeholder="Search an item to link"
                  optionFilterProp="label"
                  value={null}
                  options={linkOptions(detailCard)}
                  onChange={(v) => linkItem(v as string)}
                  className="mb-2 w-full"
                />
              )}
              {linkedCards(detailCard).length === 0 ? (
                <p className="text-sm text-faint">
                  Link items together to show that they&apos;re related.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {linkedCards(detailCard).map((linked) => (
                    <div
                      key={linked.id}
                      className="group flex items-center justify-between gap-2 rounded-md border border-line bg-surface-2 px-2 py-1.5"
                    >
                      <button
                        onClick={() => setDetailCard(linked)}
                        className="flex min-w-0 items-center gap-1.5 text-left"
                      >
                        <Tag color={TYPE_META[linked.type].color} className="shrink-0">
                          {TYPE_META[linked.type].label}
                        </Tag>
                        <span className="truncate text-sm text-fg">{linked.title}</span>
                      </button>
                      <span className="flex items-center gap-1">
                        <RunStatusPill status={linked.status} />
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          className="opacity-0 transition group-hover:opacity-100"
                          onClick={() => unlinkItem(linked.id)}
                        />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {cardRuns.length > 0 && (
              <Section title="Runs" count={cardRuns.length}>
                <div className="flex flex-col">
                  {cardRuns.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setDetailCard(null);
                        navigate(`/runs/${r.id}`);
                      }}
                      className="flex items-center gap-2 py-1.5 text-left hover:opacity-80"
                    >
                      <RunStatusPill status={r.status} />
                      <span className="min-w-0 flex-1 truncate text-sm text-fg">{r.name}</span>
                      <span className="font-mono text-[11px] text-faint">
                        {new Date(r.createdAt).toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              </Section>
            )}

            <Section title="Discussion" count={cardComments.length}>
              <CardDiscussion
                cardId={detailCard.id}
                canReview={detailCard.status === "review" && Boolean(detailCard.runId)}
                onReview={onReview}
              />
            </Section>

            <Section title="Activity" count={cardActivity.length}>
              <div className="flex flex-col">
                {cardActivity.map((e, i) => (
                  <div key={i} className="flex items-start gap-3 py-1.5">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        e.level === "error"
                          ? "bg-red-500"
                          : e.level === "warn"
                            ? "bg-amber-500"
                            : e.source === "ai"
                              ? "bg-accent"
                              : "bg-faint"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <span
                        className={`text-sm ${
                          e.level === "error"
                            ? "text-red-500"
                            : e.level === "warn"
                              ? "text-amber-500"
                              : "text-fg"
                        }`}
                      >
                        {e.message}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-faint">
                        <span>{new Date(e.at).toLocaleString()}</span>
                        {e.runId && (
                          <button
                            onClick={() => {
                              setDetailCard(null);
                              navigate(`/runs/${e.runId}`);
                            }}
                            className="text-accent"
                          >
                            view run
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {(cardBundles.length > 0 || detailCard.worktree || detailCard.artifacts.length > 0) && (
              <Section title="Artifacts" count={cardBundles.length}>
                {cardBundles.length === 0 ? (
                  <p className="text-sm text-faint">
                    No versions yet. Each completed run of this task is saved here as a build you can
                    run and view.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {cardBundles.map((b) => {
                      const isThis = previewArtifactId === b.id;
                      return (
                        <div
                          key={b.id}
                          className="rounded-md border border-line bg-surface-2 px-2 py-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 text-xs text-fg">
                              Build {b.build} · {b.fileCount} files · {fmtSize(b.sizeBytes)}
                              <span className="ml-1 text-faint">
                                {new Date(b.createdAt).toLocaleString()}
                              </span>
                            </span>
                            <Button
                              size="small"
                              type="primary"
                              icon={<LinkOutlined />}
                              style={{ background: "#E8734A" }}
                              loading={previewing && isThis}
                              onClick={() => startPreview(detailCard.id, b.id)}
                            >
                              {preview?.status === "ready" && isThis ? "Open" : "Run"}
                            </Button>
                          </div>
                          {b.files.length > 0 && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-[11px] text-faint">
                                {b.files.length} file{b.files.length === 1 ? "" : "s"}
                              </summary>
                              <div className="mt-1 flex max-h-40 flex-col gap-0.5 overflow-auto">
                                {b.files.map((f) => (
                                  <div
                                    key={f.path}
                                    className="truncate font-mono text-[11px] text-fg"
                                    title={f.path}
                                  >
                                    {f.path}
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                          {isThis && preview?.status === "building" && preview.logs.length > 0 && (
                            <pre className="mt-1 max-h-24 overflow-auto rounded bg-black/40 p-1.5 font-mono text-[10px] text-gray-300">
                              {preview.logs.slice(-8).join("\n")}
                            </pre>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>
            )}

            <div className="border-t border-line pt-2 text-xs text-faint">
              {detailCard.pack} · {detailCard.model} · ×{detailCard.maxLoops} loops
            </div>
          </div>
        )}
      </Drawer>

      {currentId && (
        <BoardPlanBuilder
          projectId={currentId}
          open={planOpen}
          onClose={() => setPlanOpen(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["board", currentId] })}
        />
      )}

      <AiActivityPanel activity={ai.activity} onClose={ai.stop} />
    </div>
  );
}
