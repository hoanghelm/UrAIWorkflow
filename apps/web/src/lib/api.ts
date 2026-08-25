import axios from "axios";
import { getActiveServer, apiBaseUrl } from "./servers";
import type {
  BoardAutomation,
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
  Design,
  DesignArtifact,
  DesignKind,
  DesignVersion,
  GeneratedDiagram,
  LedgerSummary,
  MarketplaceItem,
  PackManifest,
  PersonaPack,
  Project,
  Sprint,
  RunEvent,
  Trigger,
  UsageStat,
  Workflow,
} from "@vcc-workflow/schema";

export interface DesignWorkflowView {
  kind: DesignKind;
  label: string;
  agent: string;
  agentTitle: string;
  model: string;
  steps: { name: string; detail: string }[];
  skills: { name: string; title: string }[];
  rules: string[];
  commands: string[];
}

export interface TestWorkflowView {
  kind: string;
  label: string;
  agent: string;
  agentTitle: string;
  model: string;
  format: "code" | "markdown";
  steps: { name: string; detail: string }[];
  skills: { name: string; title: string }[];
  rules: string[];
  commands: string[];
}

const client = axios.create({ baseURL: "/api" });

client.interceptors.request.use((config) => {
  const server = getActiveServer();
  if (server.url) {
    config.baseURL = apiBaseUrl();
    if (server.token) {
      config.headers.Authorization = `Bearer ${server.token}`;
    }
  }
  return config;
});

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

export interface ProjectPackSummary extends PackSummary {
  installedVersion: string | null;
  latestVersion: string;
  updateAvailable: boolean;
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
  cloneProject: (name: string, gitUrl: string, persona?: string) =>
    client.post<Project>("/catalog/projects/clone", { name, gitUrl, persona }).then((r) => r.data),
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
  packsForProject: (projectId: string) =>
    client.get<ProjectPackSummary[]>(`/packs/project/${projectId}`).then((r) => r.data),
  installPack: (name: string, projectId: string) =>
    client
      .post<{ packName: string; installedVersion: string }>(`/packs/${name}/install`, { projectId })
      .then((r) => r.data),
  uninstallPack: (name: string, projectId: string) =>
    client.post<{ packName: string }>(`/packs/${name}/uninstall`, { projectId }).then((r) => r.data),
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

  serverConfig: () =>
    client
      .get<{
        mode: string;
        authRequired: boolean;
        version: string;
        allowedModels: string[];
        allowedProviders: string[];
        connectorsLocked: boolean;
      }>("/whoami")
      .then((r) => r.data),
  designWorkflows: () => client.get<DesignWorkflowView[]>("/design-workflows").then((r) => r.data),
  testWorkflows: () => client.get<TestWorkflowView[]>("/test-workflows").then((r) => r.data),
  generateTestPreview: (
    kind: string,
    requirement: string,
    opts?: { context?: string; model?: "opus" | "sonnet" | "haiku"; streamId?: string },
  ) =>
    client
      .post<{ content: string; format: "code" | "markdown"; summary: string }>("/test-generate", {
        kind,
        requirement,
        ...opts,
      })
      .then((r) => r.data),
  generateDesignPreview: (
    kind: DesignKind,
    requirement: string,
    opts?: { context?: string; model?: "opus" | "sonnet" | "haiku"; streamId?: string },
  ) =>
    client
      .post<{ content: string; format: "html" | "mermaid"; summary: string }>("/design-generate", {
        kind,
        requirement,
        ...opts,
      })
      .then((r) => r.data),
  designs: (projectId: string) =>
    client.get<Design[]>("/designs", { params: { projectId } }).then((r) => r.data),
  createDesign: (projectId: string, name: string, description = "") =>
    client.post<Design>("/designs", { projectId, name, description }).then((r) => r.data),
  design: (id: string) => client.get<Design>(`/designs/${id}`).then((r) => r.data),
  renameDesign: (id: string, name: string, description?: string) =>
    client.patch<Design>(`/designs/${id}`, { name, description }).then((r) => r.data),
  deleteDesign: (id: string) => client.delete<{ id: string }>(`/designs/${id}`).then((r) => r.data),
  designArtifacts: (designId: string) =>
    client.get<DesignArtifact[]>(`/designs/${designId}/artifacts`).then((r) => r.data),
  createDesignArtifact: (designId: string, kind: DesignKind, title: string, content = "") =>
    client
      .post<DesignArtifact>("/design-artifacts", { designId, kind, title, content })
      .then((r) => r.data),
  designArtifact: (id: string) =>
    client.get<DesignArtifact>(`/design-artifacts/${id}`).then((r) => r.data),
  updateDesignArtifact: (id: string, body: { title?: string; content?: string }) =>
    client.patch<DesignArtifact>(`/design-artifacts/${id}`, body).then((r) => r.data),
  deleteDesignArtifact: (id: string) =>
    client.delete<{ id: string }>(`/design-artifacts/${id}`).then((r) => r.data),
  designArtifactVersions: (id: string) =>
    client.get<DesignVersion[]>(`/design-artifacts/${id}/versions`).then((r) => r.data),
  restoreDesignVersion: (id: string, versionId: string) =>
    client
      .post<DesignArtifact>(`/design-artifacts/${id}/restore`, { versionId })
      .then((r) => r.data),
  generateDesignArtifact: (
    id: string,
    requirement: string,
    opts?: { persona?: string; streamId?: string; model?: "opus" | "sonnet" | "haiku" },
  ) =>
    client
      .post<DesignArtifact>(`/design-artifacts/${id}/generate`, { requirement, ...opts })
      .then((r) => r.data),
  figmaGenerate: (projectId: string, figmaUrl: string, token: string, title?: string) =>
    client
      .post<{ runId: string }>("/figma/generate", { projectId, figmaUrl, token, title })
      .then((r) => r.data),
  runs: (projectId?: string) =>
    client.get<RunRow[]>("/runs", { params: { projectId } }).then((r) => r.data),
  run: (id: string) => client.get<RunRow>(`/runs/${id}`).then((r) => r.data),
  runDiff: (id: string) =>
    client
      .get<{
        patch: string;
        files: { path: string; additions: number; deletions: number }[];
        branch: string;
        cwd: string;
      }>(`/runs/${id}/diff`)
      .then((r) => r.data),
  runCommit: (id: string) =>
    client
      .post<{ committed: boolean; branch: string; sha?: string; message: string }>(`/runs/${id}/commit`)
      .then((r) => r.data),
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
        artifactId: string | null;
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
  stats: (projectId: string) =>
    client.get<UsageStat[]>("/stats", { params: { projectId } }).then((r) => r.data),
  statsBackfill: (projectId: string) =>
    client
      .post<{ runs: number; blocks: number }>("/stats/backfill", null, { params: { projectId } })
      .then((r) => r.data),
  connectors: () => client.get<Connector[]>("/connectors").then((r) => r.data),
  createConnector: (input: CreateConnectorInput) =>
    client.post<Connector>("/connectors", input).then((r) => r.data),
  activateConnector: (id: string) =>
    client.post<Connector>(`/connectors/${id}/activate`).then((r) => r.data),
  deactivateConnectors: () =>
    client.post<Connector[]>("/connectors/deactivate").then((r) => r.data),
  projectActiveConnector: (projectId: string) =>
    client
      .get<{ connectorId: string | null }>("/connectors/active", { params: { projectId } })
      .then((r) => r.data),
  setProjectActiveConnector: (projectId: string, connectorId: string) =>
    client
      .post<{ connectorId: string }>("/connectors/active", { projectId, connectorId })
      .then((r) => r.data),
  clearProjectActiveConnector: (projectId: string) =>
    client
      .delete<{ projectId: string }>("/connectors/active", { params: { projectId } })
      .then((r) => r.data),
  connectorUsage: () =>
    client.get<ConnectorUsage>("/connectors/usage").then((r) => r.data),
  testConnector: (id: string) =>
    client.post<{ ok: boolean; error?: string }>(`/connectors/${id}/test`).then((r) => r.data),
  copilotLogin: () =>
    client
      .post<{
        deviceCode: string;
        userCode: string;
        verificationUri: string;
        interval: number;
        expiresIn: number;
      }>("/connectors/copilot/login")
      .then((r) => r.data),
  copilotPoll: (deviceCode: string) =>
    client
      .post<{ status: "pending" | "authorized"; connector?: Connector }>("/connectors/copilot/poll", {
        deviceCode,
      })
      .then((r) => r.data),
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
  deleteBoardComment: (cardId: string, commentId: string) =>
    client.delete<{ id: string }>(`/board/${cardId}/comments/${commentId}`).then((r) => r.data),
  boardArtifacts: (projectId: string) =>
    client.get<BoardCard[]>("/board/artifacts", { params: { projectId } }).then((r) => r.data),
  boardArtifactVersions: (projectId: string) =>
    client
      .get<
        {
          id: string;
          cardId: string | null;
          runId: string | null;
          build: number;
          title: string;
          type: "epic" | "task" | "issue";
          fileCount: number;
          sizeBytes: number;
          files: { name: string; path: string; kind: string }[];
          createdAt: string;
        }[]
      >("/board/artifact-versions", { params: { projectId } })
      .then((r) => r.data),
  collectAllArtifacts: (projectId: string) =>
    client.post<BoardCard[]>("/board/collect-all", { projectId }).then((r) => r.data),
  runBoardCard: (id: string) =>
    client.post<BoardCard>(`/board/${id}/run`).then((r) => r.data),
  setBoardCardLabels: (id: string, labels: string[]) =>
    client.patch<BoardCard>(`/board/${id}/labels`, { labels }).then((r) => r.data),
  setBoardCardAssignee: (id: string, assignee: string | null) =>
    client.patch<BoardCard>(`/board/${id}/assignee`, { assignee }).then((r) => r.data),
  updateBoardCard: (id: string, body: { title?: string; requirement?: string }) =>
    client.patch<BoardCard>(`/board/${id}`, body).then((r) => r.data),
  boardSprints: (projectId: string) =>
    client.get<Sprint[]>("/board/sprints", { params: { projectId } }).then((r) => r.data),
  createBoardSprint: (projectId: string, name: string) =>
    client.post<Sprint>("/board/sprints", { projectId, name }).then((r) => r.data),
  boardAutomations: (projectId: string) =>
    client
      .get<BoardAutomation[]>("/board/automations", { params: { projectId } })
      .then((r) => r.data),
  createBoardAutomation: (projectId: string, trigger: string, action: string) =>
    client
      .post<BoardAutomation>("/board/automations", { projectId, trigger, action })
      .then((r) => r.data),
  toggleBoardAutomation: (id: string, enabled: boolean) =>
    client.patch<BoardAutomation>(`/board/automations/${id}`, { enabled }).then((r) => r.data),
  deleteBoardAutomation: (id: string) =>
    client.delete<{ id: string }>(`/board/automations/${id}`).then((r) => r.data),
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
