import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Input,
  TextArea,
  Select,
  Empty,
  SearchOutlined,
  SendOutlined,
  AppstoreOutlined,
  ProfileOutlined,
  DeploymentUnitOutlined,
} from "@/components/ui";
import type { Design, DesignKind } from "@vcc-workflow/schema";
import { api } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { KIND_META } from "./designMeta";
import { DesignWorkflowPanel } from "./DesignWorkflowPanel";
import { useModelOptions } from "@/lib/serverConfig";

type Model = "opus" | "sonnet" | "haiku";

interface Template {
  key: string;
  label: string;
  kind: DesignKind | null;
}

const TEMPLATES: Template[] = [
  { key: "blank", label: "Blank", kind: null },
  { key: "mockup", label: "UI mockup", kind: "mockup" },
  { key: "wireframe", label: "Wireframe", kind: "wireframe" },
  { key: "flow", label: "User flow", kind: "flow" },
  { key: "design-system", label: "Color + type", kind: "design-system" },
  { key: "diagram", label: "Diagram", kind: "diagram" },
];

function TemplateThumb({ tpl }: { tpl: Template }) {
  const color = tpl.kind ? KIND_META[tpl.kind].color : "#9aa3b2";
  return (
    <div className="flex h-16 w-full items-center justify-center rounded-md border border-line bg-surface-2">
      {tpl.kind === null ? (
        <div className="h-9 w-7 rounded-sm border border-dashed border-faint" />
      ) : tpl.kind === "flow" || tpl.kind === "diagram" ? (
        <div className="flex items-center gap-1">
          <span className="h-4 w-4 rounded" style={{ background: color, opacity: 0.85 }} />
          <span className="h-px w-3" style={{ background: color }} />
          <span className="h-4 w-4 rounded-full border-2" style={{ borderColor: color }} />
        </div>
      ) : tpl.kind === "design-system" ? (
        <div className="flex items-center gap-1">
          {["#E8734A", "#2A6DAC", "#1E8657"].map((c) => (
            <span key={c} className="h-4 w-4 rounded-full" style={{ background: c }} />
          ))}
        </div>
      ) : (
        <div className="flex w-10 flex-col gap-1">
          <span className="h-2 rounded-sm" style={{ background: color, opacity: 0.85 }} />
          <span className="h-1.5 w-3/4 rounded-sm bg-faint/50" />
          <span className="h-4 rounded-sm bg-faint/25" />
        </div>
      )}
    </div>
  );
}

function DesignThumb({ design }: { design: Design }) {
  const { data: artifacts = [] } = useQuery({
    queryKey: ["design-artifacts", design.id],
    queryFn: () => api.designArtifacts(design.id),
  });
  const cover = artifacts.find((a) => a.format === "html" && a.content);
  return cover ? (
    <iframe
      title={design.name}
      srcDoc={cover.content}
      sandbox=""
      scrolling="no"
      style={{
        width: 1280,
        height: 832,
        transform: "scale(0.26)",
        transformOrigin: "top left",
        border: "none",
        pointerEvents: "none",
        background: "#fff",
      }}
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-faint">
      <DeploymentUnitOutlined style={{ fontSize: 24 }} />
    </div>
  );
}

export function DesignGalleryPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const currentId = useAppSelector((s) => s.projects.currentId);

  const [prompt, setPrompt] = useState("");
  const [template, setTemplate] = useState<Template>(TEMPLATES[0]);
  const [model, setModel] = useState<Model>("opus");
  const modelOptions = useModelOptions();
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");

  const { data: designs = [] } = useQuery({
    queryKey: ["designs", currentId],
    queryFn: () => api.designs(currentId as string),
    enabled: Boolean(currentId),
  });

  const filtered = useMemo(
    () => designs.filter((d) => d.name.toLowerCase().includes(search.trim().toLowerCase())),
    [designs, search],
  );

  const submit = async () => {
    if (!currentId || busy) return;
    setBusy(true);
    try {
      const text = prompt.trim();
      const name = text ? text.slice(0, 60) : template.kind ? KIND_META[template.kind].label : "Untitled design";
      const design = await api.createDesign(currentId, name);
      await qc.invalidateQueries({ queryKey: ["designs", currentId] });
      if (template.kind) {
        const art = await api.createDesignArtifact(
          design.id,
          template.kind,
          text ? text.slice(0, 60) : KIND_META[template.kind].label,
        );
        navigate(`/design/${design.id}`, {
          state: text ? { autogen: { artifactId: art.id, prompt: text, model } } : undefined,
        });
      } else {
        navigate(`/design/${design.id}`);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!currentId) {
    return <Empty description="Select a workspace to start designing." />;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-4">
      <h1
        className="text-center text-4xl text-fg"
        style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 400 }}
      >
        What should we create?
      </h1>

      <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <TextArea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          autoSize={{ minRows: 2, maxRows: 8 }}
          variant="borderless"
          placeholder="Describe what you want to make…"
          style={{ fontSize: 15, padding: "4px 6px" }}
        />
        <div className="mt-3 flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs text-muted"
            title="Selected template"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: template.kind ? KIND_META[template.kind].color : "#9aa3b2" }}
            />
            {template.label}
          </span>
          <span className="ml-auto flex items-center gap-2">
            <Select
              size="small"
              value={model}
              onChange={(v) => setModel(v as Model)}
              style={{ width: 110 }}
              options={modelOptions}
            />
            <Button
              type="primary"
              shape="circle"
              icon={<SendOutlined />}
              loading={busy}
              onClick={submit}
            />
          </span>
        </div>
        {template.kind && (
          <div className="mt-3">
            <DesignWorkflowPanel kind={template.kind} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-blue-500">Choose a template</div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {TEMPLATES.map((t) => {
            const on = template.key === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTemplate(t)}
                className={`flex flex-col gap-2 rounded-lg border p-2 text-center transition ${
                  on ? "border-accent bg-accent/5" : "border-line hover:border-accent/60"
                }`}
              >
                <TemplateThumb tpl={t} />
                <span className="truncate text-xs text-fg">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 border-b border-line pb-2">
          <span className="text-sm font-semibold text-fg">Projects</span>
          <span className="ml-auto flex items-center gap-2">
            <Input
              size="small"
              prefix={<SearchOutlined className="text-faint" />}
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 200 }}
            />
            <Button
              size="small"
              type={view === "list" ? "primary" : "text"}
              icon={<ProfileOutlined />}
              onClick={() => setView("list")}
            />
            <Button
              size="small"
              type={view === "grid" ? "primary" : "text"}
              icon={<AppstoreOutlined />}
              onClick={() => setView("grid")}
            />
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-6">
            <Empty description="No designs yet. Describe something above or pick a template to create one." />
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((d) => (
              <button
                key={d.id}
                onClick={() => navigate(`/design/${d.id}`)}
                className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface text-left transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg"
              >
                <div className="relative h-44 overflow-hidden border-b border-line bg-surface-2">
                  <DesignThumb design={d} />
                </div>
                <div className="flex flex-col gap-0.5 p-3.5">
                  <div className="text-[15px] font-semibold text-fg">{d.name}</div>
                  <div className="font-mono text-xs text-faint">
                    {d.artifactCount} item{d.artifactCount === 1 ? "" : "s"} ·{" "}
                    {new Date(d.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-line px-2 py-2 text-xs uppercase text-faint">
              <span>Name</span>
              <span className="w-28">Created</span>
              <span className="w-16 text-right">Items</span>
            </div>
            {filtered.map((d) => (
              <button
                key={d.id}
                onClick={() => navigate(`/design/${d.id}`)}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-md px-2 py-2 text-left hover:bg-surface-2"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-12 flex-none items-center justify-center overflow-hidden rounded border border-line bg-surface-2">
                    <div className="origin-top-left" style={{ transform: "scale(0.5)", width: 96, height: 72 }}>
                      <DesignThumb design={d} />
                    </div>
                  </span>
                  <span className="truncate text-sm font-medium text-fg">{d.name}</span>
                </span>
                <span className="w-28 text-xs text-muted">{new Date(d.createdAt).toLocaleDateString()}</span>
                <span className="w-16 text-right font-mono text-xs text-faint">{d.artifactCount}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
