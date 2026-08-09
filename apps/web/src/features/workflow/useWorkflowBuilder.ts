import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useFlowGraph, notify, type Edge, type Node, type XYPosition } from "@/components/ui";
import { workflowSchema, type Lever, type ModelTier, type Workflow } from "@vcc-workflow/schema";
import { api } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export interface StageConfig {
  title: string;
  action: string;
  instruction: string;
  agent: string;
  model: ModelTier;
  gate: boolean;
  accent: string;
  skills: string[];
  tools: string[];
  subworkflow?: string;
  verify?: string;
}

export interface PaletteItem {
  kind: string;
  label: string;
  agent: string;
  model: ModelTier;
  gate: boolean;
  accent: string;
  hint: string;
}

export const PALETTE: PaletteItem[] = [
  { kind: "start", label: "Start", agent: "system", model: "haiku", gate: false, accent: "#10B981", hint: "Where the workflow begins" },
  { kind: "ai-task", label: "AI Task", agent: "assistant", model: "sonnet", gate: false, accent: "#6366F1", hint: "Ask AI to do a task" },
  { kind: "extract-data", label: "Extract Data", agent: "extractor", model: "haiku", gate: false, accent: "#0EA5E9", hint: "Read a file or spreadsheet" },
  { kind: "transform", label: "Transform Data", agent: "transformer", model: "sonnet", gate: false, accent: "#0EA5E9", hint: "Clean, filter or reshape" },
  { kind: "summarize", label: "Summarize", agent: "summarizer", model: "haiku", gate: false, accent: "#6366F1", hint: "Condense content" },
  { kind: "generate-doc", label: "Generate Document", agent: "writer", model: "sonnet", gate: false, accent: "#10B981", hint: "Draft a document or email" },
  { kind: "review", label: "Review / Check", agent: "reviewer", model: "sonnet", gate: false, accent: "#F59E0B", hint: "Quality-check the result" },
  { kind: "subworkflow", label: "Run Workflow", agent: "system", model: "sonnet", gate: false, accent: "#8B5CF6", hint: "Run another workflow inside this one" },
  { kind: "notify", label: "Send / Notify", agent: "notifier", model: "haiku", gate: false, accent: "#10B981", hint: "Send a message or export" },
  { kind: "approval", label: "Human Approval", agent: "approver", model: "sonnet", gate: true, accent: "#F59E0B", hint: "Pause for a person to approve" },
  { kind: "break", label: "Breakpoint", agent: "system", model: "haiku", gate: true, accent: "#F59E0B", hint: "Pause here for review" },
  { kind: "end", label: "End", agent: "system", model: "haiku", gate: false, accent: "#8892A6", hint: "Where the workflow finishes" },
];

export const MARKER_ACTIONS = ["start", "end", "break"];

const DEFAULT_LEVERS: Lever[] = ["codegraph", "ponytail", "routing", "caveman"];

function actionLabel(action: string) {
  return PALETTE.find((p) => p.kind === action)?.label ?? action;
}

function accentFor(action: string) {
  return PALETTE.find((p) => p.kind === action)?.accent ?? "#8892A6";
}

function nodeStyle(accent: string, marker: boolean) {
  return {
    background: `${accent}${marker ? "3D" : "26"}`,
    border: `${marker ? 2 : 1}px solid ${accent}`,
    borderRadius: marker ? 22 : 10,
    padding: 10,
    width: marker ? 130 : 190,
    whiteSpace: "pre-line" as const,
    fontSize: 12,
    textAlign: "center" as const,
  };
}

function label(config: StageConfig) {
  if (MARKER_ACTIONS.includes(config.action)) {
    return config.title || actionLabel(config.action);
  }
  const sub = config.action === "subworkflow" && config.subworkflow ? `\n▶ ${config.subworkflow}` : "";
  return `${config.title || actionLabel(config.action)}\n${actionLabel(config.action)}${
    config.gate ? " · approval" : ""
  }${sub}`;
}

export function useWorkflowBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const currentId = useAppSelector((s) => s.projects.currentId);
  const packs = useAppSelector((s) => s.packs.list);
  const catalogItems = useAppSelector((s) => s.catalog.items);
  const { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange, onConnect } =
    useFlowGraph([], []);

  const [configs, setConfigs] = useState<Record<string, StageConfig>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("my-workflow");
  const seq = useRef(0);
  const lastId = useRef<string | null>(null);

  useEffect(() => {
    void dispatch.packs.load();
    if (currentId) {
      void dispatch.catalog.load(currentId);
    }
  }, [dispatch, currentId]);

  const skillOptions = catalogItems
    .filter((i) => i.kind === "skill")
    .map((i) => ({ label: i.name, value: i.name }));
  const toolOptions = catalogItems
    .filter((i) => i.kind === "mcp" || i.kind === "command")
    .map((i) => ({ label: `${i.name} (${i.kind})`, value: i.name }));

  const addStageAt = (kind: string, position: XYPosition) => {
    const item = PALETTE.find((p) => p.kind === kind) ?? PALETTE[1];
    seq.current += 1;
    const id = `step-${seq.current}`;
    const config: StageConfig = {
      title: item.label,
      action: item.kind,
      instruction: "",
      agent: item.agent,
      model: item.model,
      gate: item.gate,
      accent: item.accent,
      skills: [],
      tools: [],
    };
    const node: Node = {
      id,
      position,
      data: { label: label(config) },
      style: nodeStyle(item.accent, MARKER_ACTIONS.includes(item.kind)),
    };
    setConfigs((c) => ({ ...c, [id]: config }));
    setNodes((current) => [...current, node]);
    if (lastId.current) {
      const source = lastId.current;
      setEdges((current) => [
        ...current,
        { id: `${source}-${id}`, source, target: id, animated: true },
      ]);
    }
    lastId.current = id;
    setSelectedId(id);
  };

  const addStage = () => addStageAt("ai-task", { x: nodes.length * 210, y: 60 });

  const applyWorkflow = (workflow: Workflow, workflowName: string) => {
    const nextConfigs: Record<string, StageConfig> = {};
    const nextNodes: Node[] = [];
    const nextEdges: Edge[] = [];
    workflow.stages.forEach((stage, index) => {
      const accent = accentFor(stage.action);
      const config: StageConfig = {
        title: stage.title || stage.id,
        action: stage.action,
        instruction: stage.instruction,
        agent: stage.agent,
        model: stage.model,
        gate: Boolean(stage.gate),
        accent,
        skills: stage.skills,
        tools: stage.tools,
      };
      nextConfigs[stage.id] = config;
      nextNodes.push({
        id: stage.id,
        position: { x: index * 210, y: 60 },
        data: { label: label(config) },
        style: nodeStyle(accent, MARKER_ACTIONS.includes(stage.action)),
      });
      if (index > 0) {
        const source = workflow.stages[index - 1].id;
        nextEdges.push({ id: `${source}-${stage.id}`, source, target: stage.id, animated: true });
      }
    });
    setConfigs(nextConfigs);
    setNodes(nextNodes);
    setEdges(nextEdges);
    setName(workflowName);
    seq.current = workflow.stages.length;
    lastId.current = workflow.stages[workflow.stages.length - 1]?.id ?? null;
  };

  const loadPack = async (pack: string) => {
    const workflow = await api.workflowFromPack(pack, {});
    applyWorkflow(workflow, `${pack}-custom`);
  };

  const generateWithAI = async (
    requirement: string,
    context: string,
    streamId?: string,
    persona?: string,
  ) => {
    const res = await api.aiGenerate("workflow", { requirement, context, streamId, persona });
    const workflow = res.artifact as Workflow;
    applyWorkflow(workflow, workflow.name);
    return workflow;
  };

  const snapshot = () => {
    const ordered = [...nodes].sort((a, b) => a.position.x - b.position.x);
    return {
      name,
      stages: ordered.map((n) => {
        const c = configs[n.id];
        return { title: c.title, action: c.action, instruction: c.instruction, gate: c.gate };
      }),
    };
  };

  const updateSelected = (patch: Partial<StageConfig>) => {
    if (!selectedId) {
      return;
    }
    const next = { ...configs[selectedId], ...patch };
    setConfigs((c) => ({ ...c, [selectedId]: next }));
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedId
          ? {
              ...node,
              data: { label: label(next) },
              style: nodeStyle(next.accent, MARKER_ACTIONS.includes(next.action)),
            }
          : node,
      ),
    );
  };

  const removeSelected = () => {
    if (!selectedId) {
      return;
    }
    const id = selectedId;
    setNodes((current) => current.filter((node) => node.id !== id));
    setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id));
    setConfigs((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });
    setSelectedId(null);
  };

  const run = async () => {
    if (!currentId) {
      notify.error("Select a project first");
      return;
    }
    if (nodes.length === 0) {
      notify.error("Add at least one step");
      return;
    }
    const ordered = [...nodes].sort((a, b) => a.position.x - b.position.x);
    const stages: unknown[] = [];
    for (const node of ordered) {
      const config = configs[node.id];
      if (config.action === "subworkflow" && config.subworkflow) {
        const sub = await api.workflowFromPack(config.subworkflow, {});
        sub.stages.forEach((s) => stages.push({ ...s, id: `${node.id}-${s.id}` }));
        continue;
      }
      stages.push({
        id: node.id,
        title: config.title,
        action: config.action,
        instruction: config.instruction,
        agent: config.agent,
        model: config.model,
        skills: config.skills,
        tools: config.tools,
        verify: config.verify,
        gate: config.gate ? "human-approve" : undefined,
      });
    }
    const workflow = workflowSchema.parse({
      name,
      pack: "custom",
      inputs: {},
      stages,
      levers: DEFAULT_LEVERS,
      routing: { plan: "opus", exec: "sonnet" },
    });
    const created = await api.createRun({ projectId: currentId, workflow });
    void queryClient.invalidateQueries({ queryKey: ["runs"] });
    notify.success("Run started");
    navigate(`/runs/${created.id}`);
  };

  return {
    flow: {
      nodes,
      edges,
      onNodesChange,
      onEdgesChange,
      onConnect,
      onSelect: setSelectedId,
      onDropNode: addStageAt,
    },
    palette: PALETTE,
    packs,
    skillOptions,
    toolOptions,
    name,
    setName,
    selected: selectedId ? configs[selectedId] : null,
    canRun: Boolean(currentId),
    addStage,
    loadPack,
    generateWithAI,
    snapshot,
    updateSelected,
    removeSelected,
    run,
  };
}
