import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { CatalogItem } from "@vcc-workflow/schema";
import {
  Button,
  Card,
  Drawer,
  Empty,
  Markdown,
  Popconfirm,
  Select,
  Tabs,
  Tag,
  PageHeader,
  DeleteOutlined,
  FolderOpenOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  CodeOutlined,
  FileTextOutlined,
  ApiOutlined,
  BlockOutlined,
  BuildOutlined,
  ProjectOutlined,
  PlayCircleOutlined,
  AppstoreAddOutlined,
  CheckOutlined,
  ReloadOutlined,
  RightOutlined,
  RunStatusPill,
} from "@/components/ui";
import { api, type ProjectSummary, type PackSummary, type RunRow } from "@/lib/api";
import { useRunsQuery, usePersonasQuery } from "@/lib/queries";
import { useProjects } from "./useProjects";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { AddComponentsModal } from "./AddComponentsModal";
import { RunWorkflowModal } from "./RunWorkflowModal";
import { FigmaModal } from "./FigmaModal";
import { CodeGraphTab } from "./CodeGraphTab";
import { ProjectAiBuilder } from "./ProjectAiBuilder";
import { useRegisterAiBuilder } from "@/lib/activity/hooks";

const CATS: { kind: string; label: string; icon: ReactNode }[] = [
  { kind: "agent", label: "Agents", icon: <RobotOutlined /> },
  { kind: "skill", label: "Skills", icon: <ThunderboltOutlined /> },
  { kind: "tool", label: "Tools", icon: <BuildOutlined /> },
  { kind: "command", label: "Commands", icon: <CodeOutlined /> },
  { kind: "rule", label: "Rules", icon: <FileTextOutlined /> },
  { kind: "mcp", label: "MCPs", icon: <ApiOutlined /> },
  { kind: "plugin", label: "Plugins", icon: <BlockOutlined /> },
];

const ICON: Record<string, ReactNode> = Object.fromEntries(CATS.map((c) => [c.kind, c.icon]));

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

type ScopeKey = "workspace" | "local" | "builtin";

function scopeKey(item: CatalogItem): ScopeKey {
  if (item.builtin) {
    return "builtin";
  }
  return item.scope === "user" ? "local" : "workspace";
}

const SCOPE_META: {
  key: ScopeKey;
  label: string;
  color: string;
  note: string;
}[] = [
  {
    key: "workspace",
    label: "Workspace",
    color: "green",
    note: "real files under this repo's .claude",
  },
  {
    key: "local",
    label: "Local",
    color: "gold",
    note: "your machine-wide ~/.claude files, shared across every workspace",
  },
  {
    key: "builtin",
    label: "Built-in",
    color: "blue",
    note: "defaults every workspace can fall back on, not files in this repo",
  },
];

function ScopeTag({ item }: { item: CatalogItem }) {
  const meta = SCOPE_META.find((s) => s.key === scopeKey(item))!;
  return <Tag color={meta.color}>{item.builtin ? "built-in" : meta.key}</Tag>;
}

function ComponentCardMini({
  item,
  onOpen,
  onDelete,
  selected,
  onToggleSelect,
}: {
  item: CatalogItem;
  onOpen: () => void;
  onDelete: (id: string) => void;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const roles = asArray(item.meta.roles);
  const deletable = !item.builtin && Boolean(item.path);
  return (
    <div
      onClick={onOpen}
      className={`group flex cursor-pointer flex-col gap-2 rounded-xl border bg-surface-2 p-3 text-left transition hover:-translate-y-0.5 hover:border-accent ${
        selected ? "border-accent ring-1 ring-accent" : "border-line"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: "#E8734A" }}>
          {ICON[item.kind]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg">{item.title || item.name}</span>
          <span className="block truncate font-mono text-xs text-faint">{item.name}</span>
        </span>
        <ScopeTag item={item} />
      </div>
      {item.description && <p className="line-clamp-2 text-xs text-muted">{item.description}</p>}
      {roles.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {roles.map((r) => (
            <span key={r} className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-faint">
              {r}
            </span>
          ))}
        </div>
      )}
      {deletable && (
        <div
          className={`mt-auto flex items-center justify-end gap-2 border-t border-line pt-2 transition ${
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(item.id);
            }}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition ${
              selected
                ? "bg-accent text-white"
                : "bg-surface text-muted hover:text-fg"
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                selected ? "border-white bg-white/20 text-white" : "border-line text-transparent"
              }`}
            >
              <CheckOutlined />
            </span>
            {selected ? "Selected" : "Select"}
          </button>
          <span onClick={(e) => e.stopPropagation()}>
            <Popconfirm
              title="Delete this component?"
              description={
                item.scope === "user"
                  ? "Removes its file from your local ~/.claude folder."
                  : "Removes its file from this workspace's .claude folder."
              }
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => onDelete(item.id)}
            >
              <button
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-faint transition hover:bg-red-500/10 hover:text-red-500"
              >
                <DeleteOutlined /> Remove
              </button>
            </Popconfirm>
          </span>
        </div>
      )}
    </div>
  );
}

function OverviewTab({
  items,
  onSelect,
  onDeleteItems,
}: {
  items: CatalogItem[];
  onSelect: (i: CatalogItem) => void;
  onDeleteItems: (ids: string[]) => Promise<void>;
}) {
  const [kind, setKind] = useState<string | null>(null);
  const [scope, setScope] = useState<ScopeKey | null>("workspace");
  const [sel, setSel] = useState<Set<string>>(new Set());

  const matchesKind = (i: CatalogItem) => !kind || i.kind === kind;
  const matchesScope = (i: CatalogItem) => !scope || scopeKey(i) === scope;

  const scopeCount = (s: ScopeKey) =>
    items.filter((i) => scopeKey(i) === s && matchesKind(i)).length;
  const kindCount = (k: string) =>
    items.filter((i) => i.kind === k && matchesScope(i)).length;

  const visible = items.filter((i) => matchesKind(i) && matchesScope(i));
  const scopeChips = SCOPE_META.filter(
    (m) => m.key !== "local" || items.some((i) => scopeKey(i) === m.key) || scope === m.key,
  );

  const deletableVisible = visible.filter((i) => !i.builtin && i.path);
  const selectedIds = deletableVisible.filter((i) => sel.has(i.id)).map((i) => i.id);
  const allSelected = deletableVisible.length > 0 && selectedIds.length === deletableVisible.length;

  const toggleSelect = (id: string) =>
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  const clearSel = () => setSel(new Set());
  const toggleSelectAll = () =>
    setSel(allSelected ? new Set() : new Set(deletableVisible.map((i) => i.id)));

  const deleteOne = async (id: string) => {
    await onDeleteItems([id]);
    setSel((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };
  const deleteSelected = async () => {
    await onDeleteItems(selectedIds);
    clearSel();
  };

  const renderGroups = (list: CatalogItem[]): ReactNode => {
    const groups = CATS.map((c) => ({
      ...c,
      items: list.filter((i) => i.kind === c.kind),
    })).filter((g) => g.items.length > 0);
    if (groups.length === 0) {
      return null;
    }
    return groups.map((g) => (
      <div key={g.kind}>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
          <span className="text-accent">{g.icon}</span>
          {g.label}
          <span className="font-mono text-xs font-normal text-faint">({g.items.length})</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {g.items.map((i) => (
            <ComponentCardMini
              key={i.id}
              item={i}
              onOpen={() => onSelect(i)}
              onDelete={deleteOne}
              selected={sel.has(i.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      </div>
    ));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {scopeChips.map((m) => {
          const active = scope === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setScope(active ? null : m.key)}
              title={m.note}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition ${
                active
                  ? "bg-accent text-white"
                  : "bg-surface-2 text-muted hover:text-fg"
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: m.color === "green" ? "#22C55E" : m.color === "gold" ? "#F59E0B" : "#3B82F6" }}
              />
              {m.label}
              <span className={`font-mono ${active ? "text-white/80" : "text-faint"}`}>
                {scopeCount(m.key)}
              </span>
            </button>
          );
        })}
        {scope && (
          <button onClick={() => setScope(null)} className="px-2 py-1 text-xs text-accent">
            All scopes
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {CATS.map((c) => {
          const active = kind === c.kind;
          const count = kindCount(c.kind);
          return (
            <button
              key={c.kind}
              onClick={() => setKind(active ? null : c.kind)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs transition ${
                active
                  ? "bg-accent text-white"
                  : count === 0
                    ? "bg-surface-2/50 text-faint"
                    : "bg-surface-2 text-muted hover:text-fg"
              }`}
            >
              <span className={active ? "text-white" : "text-faint"}>{c.icon}</span>
              {count} {c.label.toLowerCase()}
            </button>
          );
        })}
        {kind && (
          <button onClick={() => setKind(null)} className="px-2 py-1 text-xs text-accent">
            All kinds
          </button>
        )}
        {deletableVisible.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className="ml-auto px-2 py-1 text-xs text-muted hover:text-fg"
          >
            {allSelected ? "Deselect all" : `Select all (${deletableVisible.length})`}
          </button>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-accent bg-accent/10 px-3 py-2">
          <span className="text-sm font-medium text-fg">{selectedIds.length} selected</span>
          <div className="ml-auto flex items-center gap-3">
            <span onClick={(e) => e.stopPropagation()}>
              <Popconfirm
                title={`Delete ${selectedIds.length} component${selectedIds.length === 1 ? "" : "s"}?`}
                description="Removes their files from the workspace / your ~/.claude folder."
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={deleteSelected}
              >
                <Button danger size="small" icon={<DeleteOutlined />}>
                  Delete selected
                </Button>
              </Popconfirm>
            </span>
            <button onClick={clearSel} className="text-xs text-muted hover:text-fg">
              Clear
            </button>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <Empty description="No components match this filter." />
      ) : (
        <div className="flex flex-col gap-5">{renderGroups(visible)}</div>
      )}
    </div>
  );
}

const WORKFLOW_CATEGORIES: { key: string; label: string; hint: string }[] = [
  { key: "engineering", label: "Engineering", hint: "Build, fix and ship, day to day" },
  { key: "quality", label: "Quality", hint: "Tests and triage" },
  { key: "design", label: "Design", hint: "UI and UX" },
  { key: "product", label: "Product", hint: "Specs and stories" },
  { key: "data", label: "Data", hint: "Pipelines and sync" },
  { key: "content", label: "Content", hint: "Writing and ops" },
];

const PACK_CATEGORY: Record<string, string> = {
  "eng-loop": "engineering",
  "bug-fix": "engineering",
  "feature-delivery": "engineering",
  "tech-diagram": "engineering",
  "test-planning": "quality",
  "bug-triage": "quality",
  "screen-from-figma": "design",
  "screen-design": "design",
  "ux-review": "design",
  "prd-authoring": "product",
  "story-writing": "product",
  "data-sync": "data",
  "content-ops": "content",
};

function packCategory(p: PackSummary): string {
  if (PACK_CATEGORY[p.name]) {
    return PACK_CATEGORY[p.name];
  }
  const role = p.roles[0];
  if (role === "developer" || role === "ops") return "engineering";
  if (role === "qa") return "quality";
  if (role === "designer") return "design";
  if (role === "ba-po" || role === "product") return "product";
  if (role === "analyst") return "data";
  if (role === "marketing") return "content";
  return "engineering";
}

function WorkflowCard({ p, onRun }: { p: PackSummary; onRun: (p: PackSummary) => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2 p-4">
      <div className="flex items-start gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: "#E8734A" }}>
          <PlayCircleOutlined />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-fg">{p.title || p.name}</div>
          <div className="font-mono text-xs text-faint">v{p.version}</div>
        </div>
        <Tag color={p.trust === "verified" ? "green" : "default"}>{p.trust}</Tag>
      </div>
      <p className="line-clamp-2 min-h-[32px] text-xs text-muted">{p.description}</p>
      <div className="flex flex-wrap gap-1">
        {p.roles.map((r) => (
          <span key={r} className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-faint">
            {r}
          </span>
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => onRun(p)}>
          Run
        </Button>
      </div>
    </div>
  );
}

function WorkflowsTab({ packs, onRun }: { packs: PackSummary[]; onRun: (p: PackSummary) => void }) {
  const [cat, setCat] = useState<string | null>(null);
  if (packs.length === 0) {
    return <Empty description="No workflows available." />;
  }
  const count = (key: string) => packs.filter((p) => packCategory(p) === key).length;
  const groups = WORKFLOW_CATEGORIES.filter((c) => (!cat || cat === c.key) && count(c.key) > 0).map(
    (c) => ({ ...c, items: packs.filter((p) => packCategory(p) === c.key) }),
  );
  const chips = WORKFLOW_CATEGORIES.filter((c) => count(c.key) > 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => {
          const active = cat === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setCat(active ? null : c.key)}
              title={c.hint}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition ${
                active ? "bg-accent text-white" : "bg-surface-2 text-muted hover:text-fg"
              }`}
            >
              {c.label}
              <span className={`font-mono ${active ? "text-white/80" : "text-faint"}`}>
                {count(c.key)}
              </span>
            </button>
          );
        })}
        {cat && (
          <button onClick={() => setCat(null)} className="px-2 py-1 text-xs text-accent">
            All fields
          </button>
        )}
      </div>

      {groups.map((g) => (
        <div key={g.key}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-fg">{g.label}</span>
            <span className="font-mono text-xs text-faint">({g.items.length})</span>
            <span className="text-xs text-faint">{g.hint}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {g.items.map((p) => (
              <WorkflowCard key={p.name} p={p} onRun={onRun} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionsTab({ runs, onOpen }: { runs: RunRow[]; onOpen: (id: string) => void }) {
  if (runs.length === 0) {
    return <Empty description="No workflow runs yet." />;
  }
  return (
    <div className="flex flex-col">
      {runs.map((r, i) => (
        <button
          key={r.id}
          onClick={() => onOpen(r.id)}
          className={`flex items-center gap-3 py-2.5 text-left ${
            i > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""
          }`}
        >
          <Tag color={r.kind === "session" ? "purple" : "geekblue"}>
            {r.kind === "session" ? "session" : "pipeline"}
          </Tag>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-fg">{r.name}</div>
            <div className="font-mono text-xs text-faint">
              {r.pack} · saved {r.tokensSaved.toLocaleString()} · used {r.tokensConsumed.toLocaleString()}
            </div>
          </div>
          <RunStatusPill status={r.status} />
          <RightOutlined className="text-faint" />
        </button>
      ))}
    </div>
  );
}

function ComponentDrawer({
  item,
  onClose,
  onDelete,
}: {
  item: CatalogItem | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const roles = asArray(item?.meta.roles);
  const tools = asArray(item?.meta.tools);
  const system = asString(item?.meta.system) || asString(item?.meta.guidance);
  const deletable = Boolean(item && !item.builtin && item.path);
  return (
    <Drawer
      open={Boolean(item)}
      onClose={onClose}
      title={item?.title || item?.name}
      width={560}
      extra={
        deletable && item ? (
          <Popconfirm
            title="Delete this component?"
            description={
              item.scope === "user"
                ? "Removes its file from your local ~/.claude folder."
                : "Removes its file from this workspace's .claude folder."
            }
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(item.id)}
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        ) : null
      }
    >
      {item && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Tag color="#E8734A">{item.kind}</Tag>
            <Tag color={item.trust === "verified" ? "green" : "default"}>{item.trust}</Tag>
            <ScopeTag item={item} />
            <span className="font-mono text-xs text-faint">{item.name}</span>
          </div>
          {item.description && <p className="text-sm text-muted">{item.description}</p>}
          {roles.length > 0 && (
            <div>
              <div className="mb-1 text-xs uppercase text-faint">Fits roles</div>
              <div className="flex flex-wrap gap-1">
                {roles.map((r) => (
                  <Tag key={r}>{r}</Tag>
                ))}
              </div>
            </div>
          )}
          {tools.length > 0 && (
            <div>
              <div className="mb-1 text-xs uppercase text-faint">Tools</div>
              <div className="flex flex-wrap gap-1 font-mono text-xs">
                {tools.map((t) => (
                  <span key={t} className="rounded bg-surface-2 px-2 py-0.5 text-muted">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {system && (
            <div>
              <div className="mb-1 text-xs uppercase text-faint">Instructions</div>
              <div className="rounded-md bg-surface-2 p-3 text-sm text-fg">
                <Markdown>{system}</Markdown>
              </div>
            </div>
          )}
          {item.path && (
            <div>
              <div className="mb-1 text-xs uppercase text-faint">Path</div>
              <div className="break-all font-mono text-xs text-muted">{item.path}</div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

export function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.catalog.items);
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [aiBuilderOpen, setAiBuilderOpen] = useState(false);
  const [runPack, setRunPack] = useState<PackSummary | null>(null);
  const isFigmaPack = runPack?.name === "screen-from-figma";

  useRegisterAiBuilder("Workflow", () => setAiBuilderOpen(true));
  const { data: runs = [] } = useRunsQuery(projectId);
  const { data: packs = [] } = useQuery({ queryKey: ["packs"], queryFn: () => api.packs() });
  const { data: personas = [] } = usePersonasQuery();
  const { setPersona } = useProjects();

  const changeRole = async (key: string) => {
    setProject((p) => (p ? { ...p, persona: key } : p));
    await setPersona(projectId, key);
  };

  useEffect(() => {
    void dispatch.projects.choose(projectId);
    void api.projectSummaries().then((all) => setProject(all.find((p) => p.id === projectId) ?? null));
  }, [dispatch, projectId]);

  const rescan = () => {
    void dispatch.catalog.discover(projectId);
    void api.projectSummaries().then((all) => setProject(all.find((p) => p.id === projectId) ?? null));
  };

  const deleteItems = async (ids: string[]) => {
    const targets = items.filter((i) => ids.includes(i.id) && !i.builtin && i.path).map((i) => i.id);
    await Promise.all(targets.map((id) => api.deleteCatalogItem(id).catch(() => undefined)));
    await dispatch.catalog.load(projectId);
    void api.projectSummaries().then((all) => setProject(all.find((p) => p.id === projectId) ?? null));
  };

  const tabs = useMemo(
    () => [
      {
        key: "overview",
        label: `Overview (${items.length})`,
        children: (
          <OverviewTab items={items} onSelect={setSelected} onDeleteItems={deleteItems} />
        ),
      },
      {
        key: "workflows",
        label: `Workflows (${packs.length})`,
        children: <WorkflowsTab packs={packs} onRun={setRunPack} />,
      },
      {
        key: "codegraph",
        label: "Code graph",
        children: <CodeGraphTab projectId={projectId} />,
      },
      {
        key: "sessions",
        label: `Sessions (${runs.length})`,
        children: <SessionsTab runs={runs} onOpen={(id) => navigate(`/runs/${id}`)} />,
      },
    ],
    [items, project, packs, runs, navigate, projectId],
  );

  return (
    <div>
      <PageHeader
        icon={<FolderOpenOutlined />}
        title={project?.name ?? "Project"}
        subtitle={project?.root}
        extra={
          <div className="flex items-center gap-2">
            <Select
              value={project?.persona ?? "generalist"}
              onChange={(v) => changeRole(v as string)}
              style={{ width: 160 }}
              title="Workspace role"
              options={personas.map((p) => ({ value: p.key, label: p.name }))}
            />
            <Button icon={<ReloadOutlined />} onClick={rescan}>
              Rescan
            </Button>
            <Button icon={<AppstoreAddOutlined />} onClick={() => setAddOpen(true)}>
              Add components
            </Button>
            <Button type="primary" icon={<ProjectOutlined />} onClick={() => navigate("/board")}>
              Open board
            </Button>
          </div>
        }
      />

      <Card>
        <Tabs items={tabs} />
      </Card>

      <ComponentDrawer
        item={selected}
        onClose={() => setSelected(null)}
        onDelete={async (id) => {
          setSelected(null);
          await deleteItems([id]);
        }}
      />
      <AddComponentsModal open={addOpen} onClose={() => setAddOpen(false)} />
      <FigmaModal
        projectId={projectId}
        open={isFigmaPack}
        onClose={() => setRunPack(null)}
      />
      <RunWorkflowModal
        projectId={projectId}
        pack={isFigmaPack ? null : runPack}
        onClose={() => setRunPack(null)}
      />
      <ProjectAiBuilder projectId={projectId} open={aiBuilderOpen} onClose={() => setAiBuilderOpen(false)} />
    </div>
  );
}
