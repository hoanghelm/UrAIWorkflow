import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import type { ModelTier } from "@vcc-workflow/schema";
import {
  Button,
  Card,
  Drawer,
  FlowEditor,
  Input,
  TextArea,
  Select,
  Space,
  Switch,
  Tag,
  NODE_DRAG_TYPE,
  PlusOutlined,
  ThunderboltOutlined,
  DeleteOutlined,
  RobotOutlined,
  CopyOutlined,
} from "@/components/ui";
import {
  useWorkflowBuilder,
  MARKER_ACTIONS,
  type PaletteItem,
  type StageConfig,
} from "./useWorkflowBuilder";
import { GenerativeChat, type ChatTurn } from "@/features/ai/GenerativeChat";
import { useWorkspacePersona } from "@/features/projects/useProjects";
import { useRegisterAiBuilder } from "@/lib/activity/hooks";

const SPEED_OPTIONS: { label: string; value: ModelTier }[] = [
  { label: "Fast (cheapest)", value: "haiku" },
  { label: "Balanced", value: "sonnet" },
  { label: "Best (most capable)", value: "opus" },
];

type Options = { label: string; value: string }[];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase text-faint">{label}</span>
      {children}
    </label>
  );
}

function PaletteCard({ item }: { item: PaletteItem }) {
  const onDragStart = (event: DragEvent) => {
    event.dataTransfer.setData(NODE_DRAG_TYPE, item.kind);
    event.dataTransfer.effectAllowed = "move";
  };
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="cursor-grab rounded-md border border-gray-200 bg-white px-3 py-2 active:cursor-grabbing dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: item.accent }} />
        {item.label}
      </div>
      <div className="mt-0.5 pl-[18px] text-xs text-faint">{item.hint}</div>
    </div>
  );
}

function StepPanel({
  selected,
  update,
  remove,
  packs,
  skillOptions,
  toolOptions,
  readOnly,
}: {
  selected: StageConfig;
  update: (patch: Partial<StageConfig>) => void;
  remove: () => void;
  packs: Options;
  skillOptions: Options;
  toolOptions: Options;
  readOnly?: boolean;
}) {
  const isMarker = MARKER_ACTIONS.includes(selected.action);
  const isSubworkflow = selected.action === "subworkflow";

  return (
    <div className="flex flex-col gap-3">
      <Field label="Step name">
        <Input
          value={selected.title}
          disabled={readOnly}
          onChange={(e) => update({ title: e.target.value })}
        />
      </Field>

      {isMarker ? (
        <p className="text-sm text-faint">
          {selected.action === "break"
            ? "The workflow pauses here for someone to review before continuing."
            : selected.action === "start"
              ? "Marks where the workflow begins."
              : "Marks where the workflow finishes."}
        </p>
      ) : isSubworkflow ? (
        <Field label="Workflow to run">
          <Select
            placeholder="Pick a workflow"
            value={selected.subworkflow}
            options={packs}
            disabled={readOnly}
            onChange={(v) => update({ subworkflow: v as string })}
          />
        </Field>
      ) : (
        <>
          <Field label="What should this step do? (optional)">
            <TextArea
              rows={3}
              value={selected.instruction}
              disabled={readOnly}
              placeholder="What should this workflow do?"
              onChange={(e) => update({ instruction: e.target.value })}
            />
          </Field>
          <Field label="Skills (optional)">
            <Select
              mode="multiple"
              placeholder="Attach skills from this project"
              value={selected.skills}
              options={skillOptions}
              disabled={readOnly}
              onChange={(v) => update({ skills: v as string[] })}
            />
          </Field>
          <Field label="Tools / MCP (optional)">
            <Select
              mode="multiple"
              placeholder="Attach tools or MCP servers"
              value={selected.tools}
              options={toolOptions}
              disabled={readOnly}
              onChange={(v) => update({ tools: v as string[] })}
            />
          </Field>
          <Field label="Speed vs quality">
            <Select
              value={selected.model === "inherit" ? "sonnet" : selected.model}
              options={SPEED_OPTIONS}
              disabled={readOnly}
              onChange={(v) => update({ model: v as ModelTier })}
            />
          </Field>
          <div className="flex items-center gap-2">
            <Switch checked={selected.gate} disabled={readOnly} onChange={(v) => update({ gate: v })} />
            <span className="text-sm">Wait for a person to approve</span>
          </div>
        </>
      )}

      {!readOnly && (
        <Button danger icon={<DeleteOutlined />} onClick={remove}>
          Remove step
        </Button>
      )}
    </div>
  );
}

export function WorkflowBuilderPage() {
  const builder = useWorkflowBuilder();
  const [searchParams] = useSearchParams();
  const [readOnly, setReadOnly] = useState(searchParams.get("mode") === "view");
  const [aiOpen, setAiOpen] = useState(false);
  const [context, setContext] = useState("");
  const persona = useWorkspacePersona();
  const loaded = useRef(false);

  useRegisterAiBuilder("Workflow", () => setAiOpen(true), !readOnly);

  useEffect(() => {
    if (loaded.current) {
      return;
    }
    const pack = searchParams.get("pack");
    if (pack) {
      loaded.current = true;
      void builder.loadPack(pack);
    }
  }, [searchParams, builder]);

  const buildFromChat = async (message: string, history: ChatTurn[]): Promise<string> => {
    const snap = builder.snapshot();
    const turnContext = [
      context,
      snap.stages.length ? `Current workflow "${snap.name}":\n${JSON.stringify(snap.stages)}` : "",
      history.length
        ? `Conversation so far:\n${history.map((m) => `${m.role === "user" ? "Developer" : "You"}: ${m.content}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const wf = await builder.generateWithAI(message, turnContext, undefined, persona);
    return (
      `Built **${wf.name}**, ${wf.stages.length} step${wf.stages.length === 1 ? "" : "s"}:\n\n` +
      wf.stages.map((s, i) => `${i + 1}. ${s.title || s.id}${s.gate ? " · approval" : ""}`).join("\n") +
      `\n\nIt's on the canvas. Ask for changes or run it.`
    );
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-4">
      {!readOnly && (
        <Card
          title="Actions"
          className="h-full"
          style={{ width: 200, display: "flex", flexDirection: "column" }}
          styles={{ body: { padding: 12, flex: 1, minHeight: 0, overflowY: "auto" } }}
        >
          <div className="flex flex-col gap-2">
            {builder.palette.map((item) => (
              <PaletteCard key={item.kind} item={item} />
            ))}
            <p className="mt-1 text-xs text-faint">Drag an action onto the canvas.</p>
          </div>
        </Card>
      )}

      <div className="flex flex-1 flex-col gap-3">
        <Card styles={{ body: { padding: 12 } }}>
          <Space wrap>
            <Input
              value={builder.name}
              disabled={readOnly}
              onChange={(e) => builder.setName(e.target.value)}
              style={{ width: 220 }}
            />
            {readOnly ? (
              <>
                <Tag color="gold">Read-only preview</Tag>
                <Button type="primary" icon={<CopyOutlined />} onClick={() => setReadOnly(false)}>
                  Duplicate to edit
                </Button>
              </>
            ) : (
              <>
                <Button icon={<PlusOutlined />} onClick={builder.addStage}>
                  Add step
                </Button>
                <Select
                  placeholder="Start from a template"
                  style={{ width: 200 }}
                  options={builder.packs.map((p) => ({ label: p.name, value: p.name }))}
                  onChange={(v) => builder.loadPack(v as string)}
                />
                <Button icon={<ThunderboltOutlined />} disabled={!builder.canRun} onClick={builder.run}>
                  Run workflow
                </Button>
              </>
            )}
          </Space>
        </Card>
        <Card styles={{ body: { height: "100%", padding: 0 } }} className="flex-1">
          <FlowEditor {...builder.flow} readOnly={readOnly} />
        </Card>
      </div>

      <Card
        title="Step"
        className="h-full"
        style={{ width: 320, display: "flex", flexDirection: "column" }}
        styles={{ body: { flex: 1, minHeight: 0, overflowY: "auto" } }}
      >
        {builder.selected ? (
          <StepPanel
            selected={builder.selected}
            update={builder.updateSelected}
            remove={builder.removeSelected}
            packs={builder.packs.map((p) => ({ label: p.name, value: p.name }))}
            skillOptions={builder.skillOptions}
            toolOptions={builder.toolOptions}
            readOnly={readOnly}
          />
        ) : (
          <p className="text-sm text-faint">
            Drag an action onto the canvas, then select it to configure.
          </p>
        )}
      </Card>

      <Drawer
        title={
          <span className="flex items-center gap-2">
            <RobotOutlined /> AI Builder
          </span>
        }
        placement="right"
        width={460}
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        styles={{ body: { height: "100%" } }}
      >
        <GenerativeChat
          context={context}
          setContext={setContext}
          contextPlaceholder="e.g. Tickets are in a Postgres table; team channel is Slack; urgent = P0/P1."
          inputPlaceholder="Describe the automation, or ask to change it"
          emptyHint="Describe the automation you want. I'll draw it on the canvas, then we can refine it."
          starters={[
            "Every morning, read new support tickets, classify by severity, draft replies for urgent ones, and post a summary to Slack.",
            "Take a design doc, break it into tasks, generate code for each, review it, and open a PR.",
          ]}
          onSend={buildFromChat}
        />
      </Drawer>
    </div>
  );
}
