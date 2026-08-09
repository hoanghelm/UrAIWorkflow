import { useState } from "react";
import {
  Button,
  Card,
  Drawer,
  Select,
  Spin,
  TextArea,
  Empty,
  Mermaid,
  Whiteboard,
  mermaidToScene,
  useThemeMode,
  PageHeader,
  Space,
  notify,
  DeploymentUnitOutlined,
  ReloadOutlined,
  CopyOutlined,
  RobotOutlined,
  type WhiteboardScene,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { GenerativeChat, type ChatTurn } from "@/features/ai/GenerativeChat";
import { useWorkspacePersona } from "@/features/projects/useProjects";
import { useRegisterAiBuilder } from "@/lib/activity/hooks";

const SAMPLE = `flowchart LR
  U["User"] --> W["Web (React)"]
  W --> A["API (NestJS)"]
  A --> DB[("SQLite")]
  A --> R["Runner"]
  R --> C["Claude / Stub"]
  classDef n fill:#E8734A,color:#fff;
  class U,W,A n;`;

export function DiagramsPage() {
  const currentId = useAppSelector((s) => s.projects.currentId);
  const [code, setCode] = useState(SAMPLE);
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [context, setContext] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const { mode: themeMode } = useThemeMode();
  const persona = useWorkspacePersona();

  useRegisterAiBuilder("Diagram", () => setAiOpen(true));
  const [view, setView] = useState<"mermaid" | "whiteboard">("mermaid");
  const [scene, setScene] = useState<WhiteboardScene | null>(null);
  const [sceneKey, setSceneKey] = useState(0);
  const [converting, setConverting] = useState(false);

  const loadIntoWhiteboard = async () => {
    if (!code.trim()) {
      notify.error("Nothing to convert");
      return;
    }
    setConverting(true);
    try {
      const next = await mermaidToScene(code);
      setScene(next);
      setSceneKey((k) => k + 1);
    } catch {
      notify.error(
        "Could not convert this Mermaid to a whiteboard",
        "Only flowcharts convert to editable shapes; other Mermaid types stay in code view.",
      );
    } finally {
      setConverting(false);
    }
  };

  const switchView = async (v: "mermaid" | "whiteboard") => {
    setView(v);
    if (v === "whiteboard" && !scene) {
      await loadIntoWhiteboard();
    }
  };

  const loadFromProject = async () => {
    if (!currentId) {
      notify.error("Select a project first");
      return;
    }
    setLoading(true);
    const res = await api.projectDiagram(currentId);
    setLoading(false);
    setCode(res.mermaid);
    notify.success("Generated from project");
  };

  const loadFromCode = async (level: "folder" | "file") => {
    if (!currentId) {
      notify.error("Select a workspace first");
      return;
    }
    setCodeLoading(true);
    try {
      const res = await api.projectCodeDiagram(currentId, level);
      setCode(res.mermaid);
      notify.success(`Diagram built from code (${level})`);
    } catch {
      notify.error("Could not read the code graph for this workspace.");
    } finally {
      setCodeLoading(false);
    }
  };

  const diagramFromChat = async (message: string, history: ChatTurn[]): Promise<string> => {
    const turnContext = [
      context,
      code.trim() ? `Current diagram (Mermaid):\n${code}` : "",
      history.length
        ? `Conversation so far:\n${history.map((m) => `${m.role === "user" ? "Developer" : "You"}: ${m.content}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const gen = await api.aiGenerate("diagram", { requirement: message, context: turnContext, persona });
    const res = gen.artifact as { mermaid: string };
    setCode(res.mermaid);
    if (view === "whiteboard") {
      try {
        const next = await mermaidToScene(res.mermaid);
        setScene(next);
        setSceneKey((k) => k + 1);
      } catch {
        /* non-flowchart diagrams stay in code view */
      }
    }
    return "Updated the diagram. Check the preview and ask for changes to refine it.";
  };

  const copy = () => {
    void navigator.clipboard?.writeText(code);
    notify.success("Copied");
  };

  return (
    <div>
      <PageHeader
        icon={<DeploymentUnitOutlined />}
        title="Diagrams"
        subtitle="Draw diagrams as code, or let AI generate one from a requirement."
        extra={
          <Space>
            <Select
              value={view}
              onChange={(v) => switchView(v as "mermaid" | "whiteboard")}
              style={{ width: 170 }}
              options={[
                { value: "mermaid", label: "Mermaid (code)" },
                { value: "whiteboard", label: "Whiteboard" },
              ]}
            />
            <Button icon={<ReloadOutlined />} loading={loading} onClick={loadFromProject}>
              From project
            </Button>
            <Select
              value={undefined}
              placeholder={codeLoading ? "Reading code…" : "From code"}
              disabled={codeLoading}
              style={{ width: 150 }}
              onChange={(v) => loadFromCode(v as "folder" | "file")}
              options={[
                { value: "folder", label: "Code: by folder" },
                { value: "file", label: "Code: by file" },
              ]}
            />
          </Space>
        }
      />

      <Drawer
        title={
          <span className="flex items-center gap-2">
            <RobotOutlined /> AI Builder
          </span>
        }
        placement="right"
        width={440}
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        styles={{ body: { height: "100%" } }}
      >
        <GenerativeChat
          context={context}
          setContext={setContext}
          contextPlaceholder="e.g. React + NestJS + SQLite; modules: catalog, runner, connectors; realtime over socket.io"
          inputPlaceholder="Describe the diagram, or ask to change it…"
          emptyHint="Describe what to diagram. I'll draw it in the preview, then we can refine it."
          starters={[
            "Diagram the auth flow: user logs in via OAuth, API issues a JWT, requests hit the gateway.",
            "Draw the high-level architecture of this app.",
          ]}
          onSend={diagramFromChat}
        />
      </Drawer>

      {view === "whiteboard" ? (
        <Card
          title="Whiteboard"
          styles={{ body: { padding: 0 } }}
          extra={
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={converting}
              onClick={loadIntoWhiteboard}
            >
              Load from Mermaid
            </Button>
          }
        >
          <div className="h-[calc(100vh-260px)] w-full">
            <Whiteboard
              key={sceneKey}
              theme={themeMode}
              initialData={scene}
              fallback={
                <div className="flex h-full items-center justify-center">
                  <Spin />
                </div>
              }
            />
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card
            title="Source"
            extra={
              <Button size="small" icon={<CopyOutlined />} onClick={copy}>
                Copy
              </Button>
            }
          >
            <TextArea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoSize={{ minRows: 16, maxRows: 28 }}
              style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}
            />
          </Card>
          <Card title="Preview">
            <div className="min-h-[300px] overflow-auto">
              {code.trim() ? <Mermaid code={code} /> : <Empty description="Nothing to render" />}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
