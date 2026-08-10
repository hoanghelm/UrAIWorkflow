import axios from "axios";
import type {
  BoardCard,
  BoardComment,
  BoardStatus,
  CatalogItem,
  Connector,
  ConnectorUsage,
  CreateBoardCardInput,
  CreateConnectorInput,
  CreateRunInput,
  CreateTriggerInput,
  GeneratedDiagram,
  LedgerSummary,
  MarketplaceItem,
  PackManifest,
  PersonaPack,
  Project,
  RunEvent,
  Trigger,
  Workflow,
} from "@vcc-workflow/schema";

const client = axios.create({ baseURL: "/api" });

export interface PackSummary {
  id: string;
  name: string;
  title: string;
  version: string;
  description: string;
  roles: string[];
  tags: string[];
  trust: string;
  installed: boolean;
}

export interface RunStageRow {
  id: string;
  stageId: string;
  title: string;
  agent: string;
  model: string;
  status: string;
  attempts: number;
  order: number;
}

export interface RunRow {
  id: string;
  projectId: string;
  kind?: string;
  name: string;
  pack: string;
  status: string;
  breach: string | null;
  question: string | null;
  tokensConsumed: number;
  tokensSaved: number;
  tokensInput?: number;
  tokensOutput?: number;
  tokensCached?: number;
  createdAt: string;
  workflow?: string;
  stages: RunStageRow[];
}

export interface Headroom {
  windowMs: number;
  requests: number;
  maxRequests: number;
  requestHeadroom: number;
  tokens: number;
  maxTokens: number;
  tokenHeadroom: number;
  waiting: number;
}

export interface BoardActivityEntry {
  at: string;
  level: string;
  message: string;
  runId: string | null;
  source: "item" | "ai";
}

export interface BoardRunRow {
  id: string;
  name: string;
  status: string;
  pack: string;
  tokensConsumed: number;
  tokensSaved: number;
  createdAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  root: string;
  persona: string;
  counts: Record<string, number>;
}

export interface CodeGraphNode {
  id: string;
  label: string;
  folder: string;
  orphan: boolean;
  x: number;
  y: number;
}
export interface CodeGraphEdge {
  id: string;
  source: string;
  target: string;
  circular: boolean;
}
export interface CodeGraph {
  nodes: CodeGraphNode[];
  edges: CodeGraphEdge[];
  stats: { modules: number; edges: number; cycles: number; orphans: number; truncated: boolean };
}

export const api = {
  projects: () => client.get<Project[]>("/catalog/projects").then((r) => r.data),
  projectSummaries: () =>
    client.get<ProjectSummary[]>("/catalog/summary").then((r) => r.data),
  projectDiagram: (id: string) =>
    client.get<{ mermaid: string }>(`/catalog/projects/${id}/diagram`).then((r) => r.data),
  projectFolders: (id: string) =>
    client.get<string[]>(`/catalog/projects/${id}/folders`).then((r) => r.data),
  projectCodegraph: (id: string) =>
    client.get<CodeGraph>(`/catalog/projects/${id}/codegraph`).then((r) => r.data),
  projectCodeDiagram: (id: string, level: "folder" | "file" = "folder") =>
    client
      .get<{ mermaid: string }>(`/catalog/projects/${id}/codegraph/diagram`, { params: { level } })
      .then((r) => r.data),
  explainCode: (
    projectId: string,
    body: {
      streamId: string;
      question: string;
      focus?: string;
      files: string[];
      outline: string[];
      history: { role: "user" | "assistant"; content: string }[];
    },
  ) =>
    client
      .post<{ runId: string; text: string }>(`/catalog/projects/${projectId}/explain`, body)
      .then((r) => r.data),
  generateDiagram: (requirement: string, context: string, streamId?: string) =>
    client
      .post<GeneratedDiagram>("/diagrams/generate", { requirement, context, streamId })
      .then((r) => r.data),
  registerProject: (name: string, root: string, persona?: string) =>
    client.post<Project>("/catalog/projects", { name, root, persona }).then((r) => r.data),
  setProjectPersona: (id: string, persona: string) =>
    client.patch<Project>(`/catalog/projects/${id}/persona`, { persona }).then((r) => r.data),
  deleteProject: (id: string) =>
    client.delete<{ id: string }>(`/catalog/projects/${id}`).then((r) => r.data),
  discover: (id: string) =>
    client.post<CatalogItem[]>(`/catalog/projects/${id}/discover`).then((r) => r.data),
  deleteCatalogItem: (id: string) =>
    client.delete<{ id: string }>(`/catalog/items/${encodeURIComponent(id)}`).then((r) => r.data),
  catalog: (projectId?: string) =>
    client.get<CatalogItem[]>("/catalog", { params: { projectId } }).then((r) => r.data),
  packs: () => client.get<PackSummary[]>("/packs").then((r) => r.data),
  pack: (name: string) => client.get<PackManifest>(`/packs/${name}`).then((r) => r.data),
  workflowFromPack: (pack: string, inputs: Record<string, unknown>) =>
    client.post<Workflow>("/workflows/from-pack", { pack, inputs }).then((r) => r.data),
  generateWorkflow: (requirement: string, context: string, streamId?: string) =>
    client
      .post<Workflow>("/workflows/generate", { requirement, context, streamId })
      .then((r) => r.data),
  aiGenerate: (
    kind: string,
    body: { requirement: string; context: string; persona?: string; streamId?: string },
  ) =>
    client
      .post<{ kind: string; artifact: unknown; summary: string }>("/ai/generate", { kind, ...body })
      .then((r) => r.data),
  aiPersonas: () => client.get<PersonaPack[]>("/ai/personas").then((r) => r.data),
  figmaGenerate: (projectId: string, figmaUrl: string, token: string, title?: string) =>
    client
      .post<{ runId: string }>("/figma/generate", { projectId, figmaUrl, token, title })
      .then((r) => r.data),
  runs: (projectId?: string) =>
    client.get<RunRow[]>("/runs", { params: { projectId } }).then((r) => r.data),
  run: (id: string) => client.get<RunRow>(`/runs/${id}`).then((r) => r.data),
  headroom: () => client.get<Headroom>("/runs/headroom").then((r) => r.data),
  runLogs: (id: string) =>
    client
      .get<Record<string, { text: string; trace: string; tokens: number }>>(`/runs/${id}/logs`)
      .then((r) => r.data),
  runEvents: (id: string) =>
    client.get<RunEvent[]>(`/runs/${id}/events`).then((r) => r.data),
  runArtifacts: (id: string) =>
    client
      .get<{
        cardId: string | null;
        worktree: string | null;
        artifacts: { name: string; path: string; kind: string }[];
      }>(`/runs/${id}/artifacts`)
      .then((r) => r.data),
  createRun: (input: CreateRunInput) =>
    client.post<{ id: string }>("/runs", input).then((r) => r.data),
  resumeRun: (id: string, answer: string) =>
    client.post(`/runs/${id}/resume`, { answer }).then((r) => r.data),
  stopRun: (id: string) => client.post(`/runs/${id}/stop`).then((r) => r.data),
  rerunStage: (id: string, stageId: string) =>
    client.post(`/runs/${id}/rerun/${encodeURIComponent(stageId)}`).then((r) => r.data),
  deleteRun: (id: string) => client.delete<{ id: string }>(`/runs/${id}`).then((r) => r.data),
  ledgerRun: (runId: string) =>
    client.get<LedgerSummary>(`/ledger/run/${runId}`).then((r) => r.data),
  ledgerProject: (projectId: string) =>
    client.get<LedgerSummary>(`/ledger/project/${projectId}`).then((r) => r.data),
  connectors: () => client.get<Connector[]>("/connectors").then((r) => r.data),
  createConnector: (input: CreateConnectorInput) =>
    client.post<Connector>("/connectors", input).then((r) => r.data),
  activateConnector: (id: string) =>
    client.post<Connector>(`/connectors/${id}/activate`).then((r) => r.data),
  deactivateConnectors: () =>
    client.post<Connector[]>("/connectors/deactivate").then((r) => r.data),
  connectorUsage: () =>
    client.get<ConnectorUsage>("/connectors/usage").then((r) => r.data),
  testConnector: (id: string) =>
    client.post<{ ok: boolean; error?: string }>(`/connectors/${id}/test`).then((r) => r.data),
  deleteConnector: (id: string) =>
    client.delete<{ id: string }>(`/connectors/${id}`).then((r) => r.data),
  triggers: (projectId?: string) =>
    client.get<Trigger[]>("/triggers", { params: { projectId } }).then((r) => r.data),
  createTrigger: (input: CreateTriggerInput) =>
    client.post<Trigger>("/triggers", input).then((r) => r.data),
  fireTrigger: (id: string) =>
    client.post<{ runId: string }>(`/triggers/${id}/fire`).then((r) => r.data),
  setTriggerEnabled: (id: string, enabled: boolean) =>
    client.patch<Trigger>(`/triggers/${id}/enabled`, { enabled }).then((r) => r.data),
  deleteTrigger: (id: string) =>
    client.delete<{ id: string }>(`/triggers/${id}`).then((r) => r.data),
  board: (projectId: string) =>
    client.get<BoardCard[]>("/board", { params: { projectId } }).then((r) => r.data),
  createBoardCard: (input: CreateBoardCardInput) =>
    client.post<BoardCard>("/board", input).then((r) => r.data),
  moveBoardCard: (id: string, status: BoardStatus, order: number) =>
    client.patch<BoardCard>(`/board/${id}/move`, { status, order }).then((r) => r.data),
  boardCardRuns: (id: string) =>
    client.get<BoardRunRow[]>(`/board/${id}/runs`).then((r) => r.data),
  boardCardActivity: (id: string) =>
    client.get<BoardActivityEntry[]>(`/board/${id}/activity`).then((r) => r.data),
  boardComments: (id: string) =>
    client.get<BoardComment[]>(`/board/${id}/comments`).then((r) => r.data),
  addBoardComment: (
    id: string,
    body: { body: string; kind?: "comment" | "approve" | "request_changes" },
  ) => client.post<BoardComment>(`/board/${id}/comments`, body).then((r) => r.data),
  boardArtifacts: (projectId: string) =>
    client.get<BoardCard[]>("/board/artifacts", { params: { projectId } }).then((r) => r.data),
  collectAllArtifacts: (projectId: string) =>
    client.post<BoardCard[]>("/board/collect-all", { projectId }).then((r) => r.data),
  runBoardCard: (id: string) =>
    client.post<BoardCard>(`/board/${id}/run`).then((r) => r.data),
  planBoardCard: (id: string, streamId?: string) =>
    client.post<BoardCard[]>(`/board/${id}/plan`, { streamId }).then((r) => r.data),
  collectBoardCard: (id: string) =>
    client.post<BoardCard>(`/board/${id}/collect`).then((r) => r.data),
  boardBundles: (id: string) =>
    client
      .get<
        {
          id: string;
          build: number;
          name: string;
          sizeBytes: number;
          fileCount: number;
          files: { name: string; path: string; kind: string }[];
          preview: { runnable?: boolean; kind?: string; note?: string; dir?: string };
          createdAt: string;
        }[]
      >(`/board/${id}/bundles`)
      .then((r) => r.data),
  rerunBoardCard: (id: string) =>
    client.post<BoardCard>(`/board/${id}/rerun`).then((r) => r.data),
  previewStatus: (id: string) =>
    client
      .get<{ status: string; url: string | null; logs: string[] }>(`/board/${id}/preview`)
      .then((r) => r.data),
  previewStart: (id: string, artifactId?: string) =>
    client
      .post<{ status: string; url: string | null; logs: string[] }>(`/board/${id}/preview`, {
        artifactId,
      })
      .then((r) => r.data),
  previewStop: (id: string) =>
    client.post<{ status: string }>(`/board/${id}/preview/stop`).then((r) => r.data),
  deleteBoardCard: (id: string) =>
    client.delete<{ id: string }>(`/board/${id}`).then((r) => r.data),
  linkBoardCard: (id: string, targetId: string) =>
    client.post<BoardCard>(`/board/${id}/link`, { targetId }).then((r) => r.data),
  unlinkBoardCard: (id: string, targetId: string) =>
    client.delete<BoardCard>(`/board/${id}/link/${targetId}`).then((r) => r.data),
  marketplace: () => client.get<MarketplaceItem[]>("/marketplace").then((r) => r.data),
  installComponents: (projectId: string, ids: string[]) =>
    client
      .post<{ installed: string[] }>("/marketplace/install", { projectId, ids })
      .then((r) => r.data),
};
