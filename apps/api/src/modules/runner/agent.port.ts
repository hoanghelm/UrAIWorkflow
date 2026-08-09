export interface StageRequest {
  runId: string;
  stageId: string;
  title: string;
  agent: string;
  action: string;
  instruction: string;
  model: string;
  cwd?: string;
  harness?: boolean;
  persona?: string;
  guidance?: string;
  context?: string;
  skills: string[];
  tools: string[];
  input: Record<string, unknown>;
  levers: string[];
  mcpServers?: Record<string, unknown>;
  abortController?: AbortController;
}

export interface LeverSaving {
  lever: string;
  tokensBefore: number;
  tokensAfter: number;
  saved: number;
}

export interface ToolSaving {
  source: string;
  saved: number;
}

export interface StageResult {
  output: Record<string, unknown>;
  tokensConsumed: number;
  tokensInput: number;
  tokensOutput: number;
  tokensCached: number;
  toolSavings: ToolSaving[];
  savings: LeverSaving[];
  verifierPassed: boolean;
  question?: string;
  trace?: string;
  aborted?: boolean;
}

export interface AgentPort {
  runStage(request: StageRequest): Promise<StageResult>;
}

export const AGENT_PORT = Symbol("AGENT_PORT");
