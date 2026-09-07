import { HubConnectionBuilder, HubConnectionState, type HubConnection } from "@microsoft/signalr";
import type { RunEvent } from "@vcc-workflow/schema";
import { wsBaseUrl, authToken } from "./servers";

let connection: HubConnection | null = null;

function hub(): HubConnection {
  if (!connection) {
    connection = new HubConnectionBuilder()
      .withUrl(`${wsBaseUrl()}/runs`, { accessTokenFactory: () => authToken() })
      .withAutomaticReconnect()
      .build();
  }
  if (connection.state === HubConnectionState.Disconnected) {
    void connection.start().catch(() => undefined);
  }
  return connection;
}

function subscribe<T>(method: string, handler: (value: T) => void): () => void {
  const h = hub();
  h.on(method, handler);
  return () => h.off(method, handler);
}

export function onRunEvent(handler: (event: RunEvent) => void): () => void {
  return subscribe<{ runId: string; payload: RunEvent }>("run.event", (m) => handler(m.payload));
}

export interface RunDelta {
  runId: string;
  stageId: string;
  text: string;
}

export function onRunDelta(handler: (delta: RunDelta) => void): () => void {
  return subscribe<{ runId: string; stageId: string; delta: string }>("run.delta", (m) =>
    handler({ runId: m.runId, stageId: m.stageId, text: m.delta }),
  );
}

export function onRunTrace(handler: (trace: RunDelta) => void): () => void {
  return subscribe<{ runId: string; stageId: string; trace: string }>("run.trace", (m) =>
    handler({ runId: m.runId, stageId: m.stageId, text: m.trace }),
  );
}

export interface RunStarted {
  runId: string;
  name: string;
  pack: string;
  projectId: string;
}

export function onRunStarted(handler: (meta: RunStarted) => void): () => void {
  return subscribe<RunStarted>("run.started", handler);
}

export function onBoardChanged(handler: (meta: { projectId?: string }) => void): () => void {
  return subscribe<{ projectId?: string }>("board.changed", handler);
}

export function onReconnect(handler: () => void): () => void {
  const h = hub();
  h.onreconnected(handler);
  return () => undefined;
}
