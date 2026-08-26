import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Drawer,
  Select,
  Input,
  Empty,
  Modal,
  Mermaid,
  Spin,
  notify,
  RobotOutlined,
  PlusOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  CopyOutlined,
  HistoryOutlined,
  ProjectOutlined,
  ThunderboltOutlined,
  SaveOutlined,
} from "@/components/ui";
import type { DesignArtifact, DesignKind } from "@vcc-workflow/schema";
import { api } from "@/lib/api";
import { GenerativeChat, type ChatTurn } from "@/features/ai/GenerativeChat";
import { useWorkspacePersona } from "@/features/projects/useProjects";
import { useRegisterAiBuilder } from "@/lib/activity/hooks";
import { KIND_META, CREATABLE } from "./designMeta";
import { DesignWorkflowPanel } from "./DesignWorkflowPanel";
import type { GrapesEditorHandle } from "@/components/ui/GrapesEditor";

const GrapesEditor = lazy(() =>
  import("@/components/ui/GrapesEditor").then((m) => ({ default: m.GrapesEditor })),
);

type DiffLine = { type: "same" | "add" | "del"; text: string };

function lineDiff(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "del", text: a[i] });
      i++;
    } else {
      out.push({ type: "add", text: b[j] });
      j++;
    }
  }
  while (i < n) out.push({ type: "del", text: a[i++] });
  while (j < m) out.push({ type: "add", text: b[j++] });
  return out;
}

function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const lines = useMemo(() => lineDiff(oldText, newText), [oldText, newText]);
  const adds = lines.filter((l) => l.type === "add").length;
  const dels = lines.filter((l) => l.type === "del").length;
  return (
    <div className="rounded-md border border-line">
      <div className="border-b border-line px-2 py-1 font-mono text-[11px] text-faint">
        <span className="text-green-600">+{adds}</span> <span className="text-red-500">−{dels}</span> vs current
      </div>
      <pre className="max-h-[45vh] overflow-auto p-2 font-mono text-[11px] leading-relaxed">
        {lines.map((l, k) => (
          <div
            key={k}
            className={
              l.type === "add"
                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                : l.type === "del"
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "text-muted"
            }
          >
            {l.type === "add" ? "+ " : l.type === "del" ? "− " : "  "}
            {l.text || " "}
          </div>
        ))}
      </pre>
    </div>
  );
}

export function DesignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const persona = useWorkspacePersona();
  const autogenRef = useRef(false);
  const [generating, setGenerating] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newKind, setNewKind] = useState<DesignKind>("mockup");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [renameTarget, setRenameTarget] = useState<"design" | "artifact" | null>(null);
  const [renameText, setRenameText] = useState("");
  const [sending, setSending] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const editorRef = useRef<GrapesEditorHandle>(null);

  const { data: design } = useQuery({
    queryKey: ["design", id],
    queryFn: () => api.design(id as string),
    enabled: Boolean(id),
  });
  const { data: artifacts = [] } = useQuery({
    queryKey: ["design-artifacts", id],
    queryFn: () => api.designArtifacts(id as string),
    enabled: Boolean(id),
  });

  const selected = useMemo<DesignArtifact | null>(
    () => artifacts.find((a) => a.id === selectedId) ?? artifacts[0] ?? null,
    [artifacts, selectedId],
  );

  const { data: versions = [] } = useQuery({
    queryKey: ["design-versions", selected?.id],
    queryFn: () => api.designArtifactVersions(selected!.id),
    enabled: Boolean(selected),
  });

  const refreshArtifacts = () => qc.invalidateQueries({ queryKey: ["design-artifacts", id] });
  const patchArtifact = (updated: DesignArtifact) => {
    qc.setQueryData<DesignArtifact[]>(["design-artifacts", id], (old) =>
      (old ?? []).map((a) => (a.id === updated.id ? updated : a)),
    );
    void qc.invalidateQueries({ queryKey: ["design-versions", updated.id] });
  };

  const createArtifact = async () => {
    if (!id || !newTitle.trim()) return;
    setCreating(true);
    try {
      const art = await api.createDesignArtifact(id, newKind, newTitle.trim());
      setNewTitle("");
      setNewOpen(false);
      await refreshArtifacts();
      await qc.invalidateQueries({ queryKey: ["design", id] });
      setSelectedId(art.id);
      setAiOpen(true);
    } finally {
      setCreating(false);
    }
  };

  const removeArtifact = async (artifactId: string) => {
    await api.deleteDesignArtifact(artifactId);
    if (selectedId === artifactId) setSelectedId(null);
    await refreshArtifacts();
    await qc.invalidateQueries({ queryKey: ["design", id] });
  };

  const duplicate = async () => {
    if (!id || !selected) return;
    const copy = await api.createDesignArtifact(
      id,
      selected.kind,
      `${selected.title} copy`,
      selected.content,
    );
    await refreshArtifacts();
    await qc.invalidateQueries({ queryKey: ["design", id] });
    setSelectedId(copy.id);
    notify.success("Duplicated");
  };

  const submitRename = async () => {
    if (!renameText.trim()) return;
    if (renameTarget === "design" && id) {
      const updated = await api.renameDesign(id, renameText.trim());
      qc.setQueryData(["design", id], updated);
    } else if (renameTarget === "artifact" && selected) {
      const updated = await api.updateDesignArtifact(selected.id, { title: renameText.trim() });
      patchArtifact(updated);
    }
    setRenameTarget(null);
    await refreshArtifacts();
  };

  const openRename = (target: "design" | "artifact") => {
    setRenameText(target === "design" ? (design?.name ?? "") : (selected?.title ?? ""));
    setRenameTarget(target);
  };

  const generateFromChat = async (message: string, _history: ChatTurn[]): Promise<string> => {
    if (!selected) return "Select or create an artifact first.";
    const updated = await api.generateDesignArtifact(selected.id, message, { persona });
    patchArtifact(updated);
    return `Updated **${updated.title}** — now v${updated.version}. Check the preview and ask for changes to refine it.`;
  };

  useEffect(() => {
    const autogen = (location.state as { autogen?: { artifactId: string; prompt: string; model?: "opus" | "sonnet" | "haiku" } } | null)?.autogen;
    if (!autogen || autogenRef.current) return;
    autogenRef.current = true;
    setSelectedId(autogen.artifactId);
    navigate(location.pathname, { replace: true, state: null });
    setGenerating(true);
    notify.info("Generating…", "The AI is drafting your design. This can take a minute.");
    void (async () => {
      try {
        const updated = await api.generateDesignArtifact(autogen.artifactId, autogen.prompt, {
          persona,
          model: autogen.model,
        });
        patchArtifact(updated);
        notify.success("Design ready", `${updated.title} — v${updated.version}.`);
      } catch {
        notify.error("Generation failed", "Check your connector, then use the AI Builder to retry.");
      } finally {
        setGenerating(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const restore = async (versionId: string) => {
    if (!selected) return;
    const updated = await api.restoreDesignVersion(selected.id, versionId);
    patchArtifact(updated);
    setCompareId(null);
    notify.success(`Restored to v${updated.version}`);
  };

  const sendToBoard = async (run: boolean) => {
    if (!design || !selected) return;
    if (!selected.content) {
      notify.error("This artifact is empty. Generate it first.");
      return;
    }
    setSending(true);
    try {
      const label = (KIND_META[selected.kind].label ?? selected.kind).toLowerCase();
      const requirement =
        selected.format === "html"
          ? `Implement this ${label} as production code. Match the layout, spacing, colours, and states as closely as possible.\n\n--- ${KIND_META[selected.kind].label} (self-contained HTML) ---\n${selected.content}`
          : `Build this from the following ${label} (Mermaid). Treat it as the source of truth for structure and flow.\n\n${selected.content}`;
      const card = await api.createBoardCard({
        projectId: design.projectId,
        title: selected.title,
        requirement,
        type: "task",
        pack: "eng-loop",
        model: "sonnet",
        maxLoops: 8,
        labels: ["design"],
      });
      if (run) {
        const ran = await api.runBoardCard(card.id);
        notify.success("Sent to Board & handed to agent");
        navigate(ran.runId ? `/repo/${ran.runId}` : "/board");
      } else {
        notify.success("Sent to Board", "Created a task from this design.");
        navigate("/board");
      }
    } finally {
      setSending(false);
    }
  };

  const saveEdit = async () => {
    if (!selected || !editorRef.current) return;
    setSavingEdit(true);
    try {
      const content = editorRef.current.getHtml();
      const updated = await api.updateDesignArtifact(selected.id, { content });
      patchArtifact(updated);
      notify.success("Saved", `Now v${updated.version}.`);
    } finally {
      setSavingEdit(false);
    }
  };

  const meta = selected ? KIND_META[selected.kind] : null;
  const compareVersion = versions.find((v) => v.id === compareId) ?? null;

  useRegisterAiBuilder("Design", () => setAiOpen(true), Boolean(selected));

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2">
        <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate("/design")}>
          Designs
        </Button>
        <span className="text-lg font-semibold text-fg">{design?.name ?? "Design"}</span>
        <Button type="text" size="small" onClick={() => openRename("design")}>
          Rename
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <aside className="flex w-60 flex-none flex-col rounded-lg border border-line bg-surface p-2">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold uppercase text-faint">Artifacts</span>
            <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => setNewOpen(true)} />
          </div>
          <div className="flex flex-col gap-1 overflow-y-auto">
            {artifacts.length === 0 && (
              <div className="px-2 py-3 text-sm text-faint">No artifacts. Add one to start.</div>
            )}
            {artifacts.map((a) => {
              const on = selected?.id === a.id;
              const m = KIND_META[a.kind];
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-left ${
                    on ? "bg-accent/10" : "hover:bg-surface-2"
                  }`}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: m.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-fg">{a.title}</span>
                    <span className="block text-[11px] text-faint">
                      {m.label} · v{a.version}
                    </span>
                  </span>
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void removeArtifact(a.id);
                    }}
                    className="text-faint opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                  >
                    <DeleteOutlined />
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {!selected ? (
            <Card className="flex-1">
              <Empty description="Select an artifact, or add one to start designing." />
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta?.color }} />
                  <span className="text-sm font-semibold text-fg">{selected.title}</span>
                  <span className="text-xs text-faint">
                    {meta?.label} · v{selected.version}
                  </span>
                </span>
                <span className="ml-auto flex flex-wrap items-center gap-2">
                  {selected.format === "html" && selected.content && (
                    <Button
                      size="small"
                      type="primary"
                      icon={<SaveOutlined />}
                      loading={savingEdit}
                      onClick={saveEdit}
                    >
                      Save
                    </Button>
                  )}
                  <Button size="small" onClick={() => openRename("artifact")}>
                    Rename
                  </Button>
                  <Button size="small" icon={<CopyOutlined />} onClick={duplicate}>
                    Duplicate
                  </Button>
                  <Button
                    size="small"
                    icon={<HistoryOutlined />}
                    onClick={() => setHistoryOpen(true)}
                    disabled={versions.length === 0}
                  >
                    History{versions.length ? ` (${versions.length})` : ""}
                  </Button>
                  <Button
                    size="small"
                    icon={<ProjectOutlined />}
                    loading={sending}
                    disabled={!selected.content}
                    onClick={() => sendToBoard(false)}
                  >
                    Send to Board
                  </Button>
                  <Button
                    size="small"
                    icon={<ThunderboltOutlined />}
                    loading={sending}
                    disabled={!selected.content}
                    onClick={() => sendToBoard(true)}
                  >
                    Build now
                  </Button>
                </span>
              </div>

              <Card styles={{ body: { padding: 0, height: "calc(100vh - 264px)" } }}>
                {generating ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-muted">
                    <Spin />
                    <span className="text-sm">Generating your {meta?.label.toLowerCase()}…</span>
                  </div>
                ) : selected.content ? (
                  selected.format === "html" ? (
                    <Suspense
                      fallback={
                        <div className="flex h-full items-center justify-center">
                          <Spin />
                        </div>
                      }
                    >
                      <GrapesEditor
                        key={`${selected.id}:${selected.version}`}
                        ref={editorRef}
                        html={selected.content}
                      />
                    </Suspense>
                  ) : (
                    <div className="h-full overflow-auto p-4">
                      <Mermaid code={selected.content} />
                    </div>
                  )
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Empty description="Empty artifact. Open the AI Builder to generate it." />
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>

      <Drawer
        title={
          <span className="flex items-center gap-2">
            <RobotOutlined /> AI Builder{selected ? ` — ${meta?.label}` : ""}
          </span>
        }
        placement="right"
        width={440}
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        styles={{ body: { height: "100%" } }}
      >
        {selected ? (
          <div className="flex h-full flex-col gap-3">
            <DesignWorkflowPanel kind={selected.kind} />
            <div className="min-h-0 flex-1">
              <GenerativeChat
                context={context}
                setContext={setContext}
                contextPlaceholder="Optional context: brand, audience, constraints, existing styles…"
                inputPlaceholder={`Describe the ${meta?.label.toLowerCase()}, or ask to change it`}
                emptyHint={meta?.hint ?? "Describe what to build."}
                starters={meta?.starters ?? []}
                onSend={generateFromChat}
              />
            </div>
          </div>
        ) : (
          <Empty description="Select an artifact first." />
        )}
      </Drawer>

      <Drawer
        title={
          <span className="flex items-center gap-2">
            <HistoryOutlined /> Version history
          </span>
        }
        placement="right"
        width={520}
        open={historyOpen}
        onClose={() => {
          setHistoryOpen(false);
          setCompareId(null);
        }}
      >
        <div className="flex flex-col gap-2">
          {versions.length === 0 && <Empty description="No versions yet." />}
          {versions.map((v) => {
            const isCurrent = selected?.version === v.build;
            return (
              <div
                key={v.id}
                className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2"
              >
                <span className="font-mono text-sm text-fg">v{v.build}</span>
                {isCurrent && (
                  <span className="rounded-full bg-accent/15 px-2 text-[11px] text-accent">current</span>
                )}
                <span className="text-xs text-faint">{new Date(v.createdAt).toLocaleString()}</span>
                <span className="ml-auto flex items-center gap-1.5">
                  <Button
                    size="small"
                    type="text"
                    onClick={() => setCompareId(compareId === v.id ? null : v.id)}
                  >
                    {compareId === v.id ? "Hide diff" : "Compare"}
                  </Button>
                  {!isCurrent && (
                    <Button size="small" onClick={() => restore(v.id)}>
                      Restore
                    </Button>
                  )}
                </span>
              </div>
            );
          })}
          {compareVersion && selected && (
            <DiffView oldText={compareVersion.content} newText={selected.content} />
          )}
        </div>
      </Drawer>

      <Modal
        title="New artifact"
        open={newOpen}
        onCancel={() => setNewOpen(false)}
        onOk={createArtifact}
        okText="Create"
        confirmLoading={creating}
        okButtonProps={{ disabled: !newTitle.trim() }}
      >
        <div className="flex flex-col gap-3 pt-2">
          <Select
            value={newKind}
            onChange={(v) => setNewKind(v as DesignKind)}
            className="w-full"
            options={CREATABLE.map((k) => ({ value: k, label: KIND_META[k].label }))}
          />
          <Input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onPressEnter={() => void createArtifact()}
            placeholder="Title"
          />
        </div>
      </Modal>

      <Modal
        title={renameTarget === "design" ? "Rename design" : "Rename artifact"}
        open={renameTarget !== null}
        onCancel={() => setRenameTarget(null)}
        onOk={submitRename}
        okText="Save"
        okButtonProps={{ disabled: !renameText.trim() }}
      >
        <Input
          autoFocus
          value={renameText}
          onChange={(e) => setRenameText(e.target.value)}
          onPressEnter={() => void submitRename()}
        />
      </Modal>
    </div>
  );
}
