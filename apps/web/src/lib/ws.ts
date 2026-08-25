import { io, type Socket } from "socket.io-client";
import type { RunEvent } from "@vcc-workflow/schema";
import { wsBaseUrl, authToken } from "./servers";

let socket: Socket | null = null;

function connect(): Socket {
  if (!socket) {
    const token = authToken();
    socket = io(`${wsBaseUrl()}/runs`, {
      transports: ["websocket"],
      ...(token ? { auth: { token } } : {}),
    });
  }
  return socket;
}

export function onRunEvent(handler: (event: RunEvent) => void): () => void {
  const s = connect();
  s.on("run.event", handler);
  return () => {
    s.off("run.event", handler);
  };
}

export interface RunDelta {
  runId: string;
  stageId: string;
  text: string;
}

export function onRunDelta(handler: (delta: RunDelta) => void): () => void {
  const s = connect();
  s.on("run.delta", handler);
  return () => {
    s.off("run.delta", handler);
  };
}

export function onRunTrace(handler: (trace: RunDelta) => void): () => void {
  const s = connect();
  s.on("run.trace", handler);
  return () => {
    s.off("run.trace", handler);
  };
}

export interface RunStarted {
  runId: string;
  name: string;
  pack: string;
  projectId: string;
}

export function onRunStarted(handler: (meta: RunStarted) => void): () => void {
  const s = connect();
  s.on("run.started", handler);
  return () => {
    s.off("run.started", handler);
  };
}

export function onBoardChanged(handler: (meta: { projectId?: string }) => void): () => void {
  const s = connect();
  s.on("board.changed", handler);
  return () => {
    s.off("board.changed", handler);
  };
}

export function onReconnect(handler: () => void): () => void {
  const s = connect();
  s.io.on("reconnect", handler);
  return () => {
    s.io.off("reconnect", handler);
  };
}
