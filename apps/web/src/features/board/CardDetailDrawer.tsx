import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Drawer,
  Input,
  TextArea,
  Modal,
  Select,
  Tag,
  RunStatusPill,
  notify,
  PlusOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  CloseOutlined,
  DownOutlined,
  LinkOutlined,
  DeleteOutlined,
} from "@/components/ui";
import type { BoardCard, ItemType } from "@vcc-workflow/schema";
import { api, type RunRow } from "@/lib/api";
import { useAiActivity } from "@/features/ai/useAiActivity";
import { CardDiscussion } from "./CardDiscussion";
import { AssigneeControl } from "./AssigneeControl";
import { TYPE_META, ITEM_TYPE_OPTIONS } from "./itemMeta";

const REVIEW_TAG: Record<string, { label: string; color: string }> = {
  approved: { label: "approved", color: "green" },
  changes_requested: { label: "changes requested", color: "gold" },
};

const fmtSize = (b: number) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

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
          <span className="rounded-full bg-surface-2 px-2 text-xs font-normal text-faint">{count}</span>
        </button>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
      {open && <div className="border-t border-line px-3 py-3">{children}</div>}
    </div>
  );
}

export function CardDetailDrawer({
  cardId,
  cards,
  runs,
  projectId,
  onClose,
  onOpenCard,
}: {
  cardId: string | null;
  cards: BoardCard[];
  runs: RunRow[];
  projectId: string;
  onClose: () => void;
  onOpenCard: (id: string) => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const ai = useAiActivity();

  const card = cardId ? cards.find((c) => c.id === cardId) ?? null : null;

  const childrenOf = (id: string) => cards.filter((c) => c.parentId === id);
  const parentOf = (c: BoardCard) => (c.parentId ? cards.find((x) => x.id === c.parentId) ?? null : null);
  const linkedCards = (c: BoardCard) =>
    c.links.map((id) => cards.find((x) => x.id === id)).filter((x): x is BoardCard => Boolean(x));
  const linkOptions = (c: BoardCard) =>
    cards
      .filter((x) => x.id !== c.id && !c.links.includes(x.id))
      .map((x) => ({ value: x.id, label: `${TYPE_META[x.type].label}: ${x.title}` }));

  const { data: cardActivity = [] } = useQuery({
    queryKey: ["board-activity", cardId],
    queryFn: () => api.boardCardActivity(cardId as string),
    enabled: Boolean(cardId),
  });
  const { data: cardComments = [] } = useQuery({
    queryKey: ["board-comments", cardId],
    queryFn: () => api.boardComments(cardId as string),
    enabled: Boolean(cardId),
  });
  const { data: cardBundles = [] } = useQuery({
    queryKey: ["board-bundles", cardId],
    queryFn: () => api.boardBundles(cardId as string),
    enabled: Boolean(cardId),
  });
  const { data: cardRuns = [] } = useQuery({
    queryKey: ["board-runs", cardId],
    queryFn: () => api.boardCardRuns(cardId as string),
    enabled: Boolean(cardId),
  });

  const refreshBoard = () => qc.invalidateQueries({ queryKey: ["board", projectId] });

  const [descEdit, setDescEdit] = useState(false);
  const [descText, setDescText] = useState("");
  const [descSaving, setDescSaving] = useState(false);
  const saveDesc = async () => {
    if (!card) return;
    setDescSaving(true);
    try {
      await api.updateBoardCard(card.id, { requirement: descText });
      setDescEdit(false);
      void refreshBoard();
    } finally {
      setDescSaving(false);
    }
  };

  const [running, setRunning] = useState(false);
  const runFromDetail = async (id: string) => {
    setRunning(true);
    try {
      await api.runBoardCard(id);
      notify.success("Run started");
      void refreshBoard();
      void qc.invalidateQueries({ queryKey: ["runs", projectId] });
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
      await refreshBoard();
    } catch {
      notify.error("Planning needs an active Claude connector.");
    } finally {
      setPlanning(false);
      ai.stop();
    }
  };

  const [linkOpen, setLinkOpen] = useState(false);
  const linkItem = async (targetId: string) => {
    if (!card) return;
    await api.linkBoardCard(card.id, targetId);
    setLinkOpen(false);
    void refreshBoard();
  };
  const unlinkItem = async (targetId: string) => {
    if (!card) return;
    await api.unlinkBoardCard(card.id, targetId);
    void refreshBoard();
  };

  const [preview, setPreview] = useState<{ status: string; url: string | null; logs: string[] } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewArtifactId, setPreviewArtifactId] = useState<string | null>(null);
  useEffect(() => {
    setPreview(null);
    setPreviewing(false);
    setPreviewArtifactId(null);
  }, [cardId]);
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

  const [subOpen, setSubOpen] = useState(false);
  const [subTitle, setSubTitle] = useState("");
  const [subRequirement, setSubRequirement] = useState("");
  const [subType, setSubType] = useState<ItemType>("task");
  const [subBusy, setSubBusy] = useState(false);
  const openSubItem = (parent: BoardCard) => {
    setSubType(parent.type === "epic" ? "task" : "issue");
    setSubTitle("");
    setSubRequirement("");
    setSubOpen(true);
  };
  const createSubItem = async () => {
    if (!card || !subTitle.trim()) return;
    setSubBusy(true);
    try {
      await api.createBoardCard({
        projectId,
        title: subTitle.trim(),
        requirement: subRequirement.trim(),
        type: subType,
        parentId: card.id,
        pack: card.pack,
        model: card.model as "opus" | "sonnet" | "haiku",
        maxLoops: card.maxLoops,
        labels: [],
        sprintId: card.sprintId ?? undefined,
      });
      setSubOpen(false);
      await refreshBoard();
    } finally {
      setSubBusy(false);
    }
  };

  const onReview = () => {
    void refreshBoard();
    void qc.invalidateQueries({ queryKey: ["runs", projectId] });
  };

  return (
    <>
      <Drawer
        title={card?.title}
        placement="right"
        width={480}
        open={Boolean(card)}
        onClose={onClose}
        closable={false}
        extra={
          <button onClick={onClose} className="text-faint hover:text-fg" aria-label="Close">
            <CloseOutlined />
          </button>
        }
      >
        {card && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag color={TYPE_META[card.type].color}>{TYPE_META[card.type].label}</Tag>
              <RunStatusPill status={card.status} />
              {REVIEW_TAG[card.review] && (
                <Tag color={REVIEW_TAG[card.review].color}>{REVIEW_TAG[card.review].label}</Tag>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-faint">Assignee</span>
              <span className="b2">
                <AssigneeControl card={card} />
              </span>
            </div>

            {parentOf(card) && (
              <Button
                type="link"
                size="small"
                className="self-start px-0"
                onClick={() => onOpenCard(parentOf(card)!.id)}
              >
                Part of {TYPE_META[parentOf(card)!.type].label}: {parentOf(card)!.title}
              </Button>
            )}

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase text-faint">Description</span>
                {!descEdit && (
                  <Button
                    type="link"
                    size="small"
                    className="px-0"
                    onClick={() => {
                      setDescText(card.requirement);
                      setDescEdit(true);
                    }}
                  >
                    {card.requirement ? "Edit" : "Add"}
                  </Button>
                )}
              </div>
              {descEdit ? (
                <div className="flex flex-col gap-2">
                  <TextArea
                    autoFocus
                    value={descText}
                    onChange={(e) => setDescText(e.target.value)}
                    autoSize={{ minRows: 3, maxRows: 14 }}
                    placeholder="Description"
                  />
                  <div className="flex gap-2">
                    <Button type="primary" size="small" loading={descSaving} onClick={saveDesc}>
                      Save
                    </Button>
                    <Button size="small" onClick={() => setDescEdit(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : card.requirement ? (
                <div className="whitespace-pre-wrap break-words rounded-md border border-line bg-surface-2 p-3 text-sm leading-relaxed text-fg">
                  {card.requirement}
                </div>
              ) : (
                <div className="text-sm text-faint">No description yet — add one so the AI knows what to build.</div>
              )}
            </div>

            {(() => {
              const cardRun = card.runId ? runs.find((r) => r.id === card.runId) : null;
              if (cardRun?.status !== "needs_input" || !cardRun.question) return null;
              return (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  <div className="mb-1 font-medium text-amber-600 dark:text-amber-400">Needs your input</div>
                  <div className="text-fg">{cardRun.question}</div>
                  <div className="mt-1 text-xs text-faint">
                    Comment @model below to answer and continue the run.
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-2">
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={running}
                onClick={() => runFromDetail(card.id)}
                className="flex-1"
              >
                Run with AI
              </Button>
              {card.status !== "cancelled" && card.status !== "completed" && card.status !== "closed" && (
                <Button
                  danger
                  onClick={async () => {
                    await api.moveBoardCard(card.id, "cancelled", 0);
                    void refreshBoard();
                  }}
                >
                  Cancel task
                </Button>
              )}
            </div>

            {(card.type !== "issue" || childrenOf(card.id).length > 0) && (
              <Section
                title="Sub-items"
                count={childrenOf(card.id).length}
                actions={
                  <>
                    {card.type !== "issue" && (
                      <Button
                        type="text"
                        size="small"
                        icon={<RobotOutlined />}
                        loading={planning}
                        onClick={() => planWithAI(card.id)}
                      />
                    )}
                    <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => openSubItem(card)} />
                  </>
                }
              >
                {childrenOf(card.id).length === 0 ? (
                  <p className="text-sm text-faint">Break this down into smaller items with AI, or add one.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {childrenOf(card.id).map((child) => (
                      <button
                        key={child.id}
                        onClick={() => onOpenCard(child.id)}
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
              count={linkedCards(card).length}
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
                  options={linkOptions(card)}
                  onChange={(v) => linkItem(v as string)}
                  className="mb-2 w-full"
                />
              )}
              {linkedCards(card).length === 0 ? (
                <p className="text-sm text-faint">Link items together to show that they&apos;re related.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {linkedCards(card).map((linked) => (
                    <div
                      key={linked.id}
                      className="group flex items-center justify-between gap-2 rounded-md border border-line bg-surface-2 px-2 py-1.5"
                    >
                      <button
                        onClick={() => onOpenCard(linked.id)}
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
                        onClose();
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
                cardId={card.id}
                canReview={card.status === "review" && Boolean(card.runId)}
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
                              onClose();
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

            {(cardBundles.length > 0 || card.worktree || card.artifacts.length > 0) && (
              <Section title="Artifacts" count={cardBundles.length || card.artifacts.length}>
                {cardBundles.length === 0 ? (
                  card.artifacts.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-faint">
                          {card.artifacts.length} file{card.artifacts.length === 1 ? "" : "s"} from the latest run
                        </span>
                        <Button
                          size="small"
                          type="primary"
                          icon={<LinkOutlined />}
                          style={{ background: "#E8734A" }}
                          loading={previewing}
                          onClick={() => startPreview(card.id)}
                        >
                          {preview?.status === "ready" ? "Open" : "Run"}
                        </Button>
                      </div>
                      <div className="flex max-h-56 flex-col gap-0.5 overflow-auto rounded-md border border-line bg-surface-2 p-2">
                        {card.artifacts.map((f) => (
                          <div key={f.path} className="flex items-center gap-2" title={f.path}>
                            <span
                              className={`shrink-0 rounded px-1 text-[10px] ${
                                f.kind === "edited"
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                  : "bg-accent/15 text-accent"
                              }`}
                            >
                              {f.kind}
                            </span>
                            <span className="truncate font-mono text-[11px] text-fg">{f.name}</span>
                          </div>
                        ))}
                      </div>
                      {preview?.status === "building" && preview.logs.length > 0 && (
                        <pre className="max-h-24 overflow-auto rounded bg-[#14161c] p-1.5 font-mono text-[10px] text-[#c9d1d9]">
                          {preview.logs.slice(-8).join("\n")}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-faint">
                      No versions yet. Each completed run of this task is saved here as a build you can run and
                      view.
                    </p>
                  )
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {cardBundles.map((b) => {
                      const isThis = previewArtifactId === b.id;
                      return (
                        <div key={b.id} className="rounded-md border border-line bg-surface-2 px-2 py-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 text-xs text-fg">
                              Build {b.build} · {b.fileCount} files · {fmtSize(b.sizeBytes)}
                              <span className="ml-1 text-faint">{new Date(b.createdAt).toLocaleString()}</span>
                            </span>
                            <Button
                              size="small"
                              type="primary"
                              icon={<LinkOutlined />}
                              style={{ background: "#E8734A" }}
                              loading={previewing && isThis}
                              onClick={() => startPreview(card.id, b.id)}
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
                            <pre className="mt-1 max-h-24 overflow-auto rounded bg-[#14161c] p-1.5 font-mono text-[10px] text-[#c9d1d9]">
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
              {card.pack} · {card.model} · ×{card.maxLoops} loops
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        title="Add sub-item"
        open={subOpen}
        onCancel={() => setSubOpen(false)}
        onOk={createSubItem}
        okText="Create"
        confirmLoading={subBusy}
        okButtonProps={{ disabled: !subTitle.trim() }}
      >
        <div className="flex flex-col gap-3 pt-2">
          <Select
            value={subType}
            options={ITEM_TYPE_OPTIONS}
            onChange={(v) => setSubType(v as ItemType)}
            className="w-full"
          />
          <Input
            autoFocus
            value={subTitle}
            onChange={(e) => setSubTitle(e.target.value)}
            placeholder="Title"
          />
          <TextArea
            value={subRequirement}
            onChange={(e) => setSubRequirement(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
          />
        </div>
      </Modal>
    </>
  );
}
