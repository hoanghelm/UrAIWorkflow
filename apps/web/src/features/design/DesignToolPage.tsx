import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Select,
  TextArea,
  Empty,
  Spin,
  Mermaid,
  notify,
  PageHeader,
  DeploymentUnitOutlined,
  SendOutlined,
  ProjectOutlined,
  ThunderboltOutlined,
  SaveOutlined,
} from "@/components/ui";
import type { DesignKind } from "@vcc-workflow/schema";
import { api } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { KIND_META, CREATABLE } from "./designMeta";
import { DesignWorkflowPanel } from "./DesignWorkflowPanel";
import { useModelOptions } from "@/lib/serverConfig";

type Model = "opus" | "sonnet" | "haiku";

export function DesignToolPage() {
  const { kind } = useParams<{ kind: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const currentId = useAppSelector((s) => s.projects.currentId);

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<Model>("opus");
  const modelOptions = useModelOptions();
  const [content, setContent] = useState("");
  const [format, setFormat] = useState<"html" | "mermaid">("html");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!kind || !CREATABLE.includes(kind as DesignKind)) {
    return <Empty description="Unknown design tool." />;
  }
  const k = kind as DesignKind;
  const meta = KIND_META[k];

  const generate = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    try {
      const context = content ? `Current ${k} (${format}):\n${content}` : "";
      const res = await api.generateDesignPreview(k, prompt.trim(), { context, model });
      if (!res.content) {
        notify.error("Nothing generated", "Check your connector, then try again.");
        return;
      }
      setContent(res.content);
      setFormat(res.format);
      setPrompt("");
    } finally {
      setBusy(false);
    }
  };

  const saveToDesign = async () => {
    if (!currentId || !content) return;
    setSaving(true);
    try {
      const name = meta.label;
      const design = await api.createDesign(currentId, name);
      const art = await api.createDesignArtifact(design.id, k, meta.label, content);
      await qc.invalidateQueries({ queryKey: ["designs", currentId] });
      notify.success("Saved to a new design");
      navigate(`/design/${design.id}`, { state: { focusArtifact: art.id } });
    } finally {
      setSaving(false);
    }
  };

  const sendToBoard = async (run: boolean) => {
    if (!currentId || !content) return;
    setSaving(true);
    try {
      const label = meta.label.toLowerCase();
      const requirement =
        format === "html"
          ? `Implement this ${label} as production code. Match the layout, spacing, colours, and states as closely as possible.\n\n--- ${meta.label} (self-contained HTML) ---\n${content}`
          : `Build this from the following ${label} (Mermaid). Treat it as the source of truth for structure and flow.\n\n${content}`;
      const card = await api.createBoardCard({
        projectId: currentId,
        title: meta.label,
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
        notify.success("Sent to Board");
        navigate("/board");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        icon={<DeploymentUnitOutlined />}
        title={meta.label}
        subtitle={meta.hint}
        extra={
          <Button icon={<ProjectOutlined />} onClick={() => navigate("/design")}>
            My designs
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex w-80 flex-none flex-col gap-3 overflow-y-auto">
          <div className="rounded-xl border border-line bg-surface p-3">
            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void generate();
                }
              }}
              autoSize={{ minRows: 3, maxRows: 10 }}
              variant="borderless"
              placeholder={content ? `Ask to change the ${meta.label.toLowerCase()}…` : `Describe the ${meta.label.toLowerCase()} to create`}
              style={{ fontSize: 14 }}
            />
            <div className="mt-2 flex items-center gap-2">
              <Select
                size="small"
                value={model}
                onChange={(v) => setModel(v as Model)}
                style={{ width: 100 }}
                options={modelOptions}
              />
              <Button
                type="primary"
                shape="circle"
                icon={<SendOutlined />}
                loading={busy}
                disabled={!prompt.trim()}
                onClick={generate}
                className="ml-auto"
              />
            </div>
          </div>

          {!content && meta.starters.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {meta.starters.map((s) => (
                <button
                  key={s}
                  onClick={() => setPrompt(s)}
                  className="rounded-lg border border-line bg-surface px-3 py-2 text-left text-xs text-muted hover:border-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <DesignWorkflowPanel kind={k} />

          {content && (
            <div className="flex flex-wrap gap-2">
              <Button icon={<SaveOutlined />} loading={saving} disabled={!currentId} onClick={saveToDesign}>
                Save to design
              </Button>
              <Button icon={<ProjectOutlined />} loading={saving} disabled={!currentId} onClick={() => sendToBoard(false)}>
                Send to Board
              </Button>
              <Button icon={<ThunderboltOutlined />} loading={saving} disabled={!currentId} onClick={() => sendToBoard(true)}>
                Build now
              </Button>
            </div>
          )}
        </div>

        <Card styles={{ body: { padding: 0, height: "calc(100vh - 200px)" } }} className="min-w-0 flex-1">
          {busy && !content ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted">
              <Spin />
              <span className="text-sm">Generating your {meta.label.toLowerCase()}…</span>
            </div>
          ) : content ? (
            format === "html" ? (
              <iframe
                title={meta.label}
                srcDoc={content}
                sandbox="allow-scripts allow-forms"
                style={{ width: "100%", height: "100%", border: "none", background: "#fff" }}
              />
            ) : (
              <div className="h-full overflow-auto p-4">
                <Mermaid code={content} />
              </div>
            )
          ) : (
            <div className="flex h-full items-center justify-center">
              <Empty description={`Describe a ${meta.label.toLowerCase()} on the left to generate it.`} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
