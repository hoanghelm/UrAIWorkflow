import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Select,
  TextArea,
  Empty,
  Spin,
  Markdown,
  notify,
  PageHeader,
  ExperimentOutlined,
  SendOutlined,
  CopyOutlined,
  ProjectOutlined,
  ThunderboltOutlined,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { TEST_META, TEST_KINDS, type TestKind } from "./testMeta";
import { TestWorkflowPanel } from "./TestWorkflowPanel";
import { useModelOptions } from "@/lib/serverConfig";

type Model = "opus" | "sonnet" | "haiku";

export function TestToolPage() {
  const { kind } = useParams<{ kind: string }>();
  const navigate = useNavigate();
  const currentId = useAppSelector((s) => s.projects.currentId);

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<Model>("opus");
  const modelOptions = useModelOptions();
  const [content, setContent] = useState("");
  const [format, setFormat] = useState<"code" | "markdown">("code");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!kind || !TEST_KINDS.includes(kind as TestKind)) {
    return <Empty description="Unknown test tool." />;
  }
  const k = kind as TestKind;
  const meta = TEST_META[k];

  const generate = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    try {
      const context = content ? `Current ${k} (${format}):\n${content}` : "";
      const res = await api.generateTestPreview(k, prompt.trim(), { context, model });
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

  const copy = () => {
    void navigator.clipboard?.writeText(content);
    notify.success("Copied");
  };

  const sendToBoard = async (run: boolean) => {
    if (!currentId || !content) return;
    setSaving(true);
    try {
      const label = meta.label.toLowerCase();
      const requirement =
        format === "code"
          ? `Add these ${label} to the project's test suite. Put them in the correct location, wire them into the test setup/config, and make sure they run and pass.\n\n--- ${meta.label} ---\n${content}`
          : `Use this ${label} to drive QA for the project. Turn the test cases into automated tests where practical.\n\n--- ${meta.label} ---\n${content}`;
      const card = await api.createBoardCard({
        projectId: currentId,
        title: meta.label,
        requirement,
        type: "task",
        pack: "eng-loop",
        model: "sonnet",
        maxLoops: 8,
        labels: ["tests"],
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
      <PageHeader icon={<ExperimentOutlined />} title={meta.label} subtitle={meta.hint} />

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
              placeholder={content ? `Ask to change the ${meta.label.toLowerCase()}…` : `Describe the ${meta.label.toLowerCase()} to generate`}
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

          <TestWorkflowPanel kind={k} color={meta.color} />

          {content && (
            <div className="flex flex-wrap gap-2">
              <Button icon={<CopyOutlined />} onClick={copy}>
                Copy
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
            format === "code" ? (
              <div className="relative h-full">
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={copy}
                  className="absolute right-3 top-3 z-10"
                >
                  Copy
                </Button>
                <pre
                  className="h-full overflow-auto p-4 font-mono text-[12.5px] leading-relaxed"
                  style={{ background: "#14161c", color: "#c9d1d9", margin: 0 }}
                >
                  {content}
                </pre>
              </div>
            ) : (
              <div className="h-full overflow-auto p-5">
                <Markdown>{content}</Markdown>
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
