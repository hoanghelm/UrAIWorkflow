import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import type { RunEvent } from "@vcc-workflow/schema";

@WebSocketGateway({ cors: { origin: true }, namespace: "/runs" })
export class RunnerGateway {
  @WebSocketServer()
  server!: Server;

  emitEvent(event: RunEvent): void {
    this.server.emit("run.event", event);
    this.server.emit(`run.${event.runId}`, event);
  }

  emitDelta(delta: { runId: string; stageId: string; text: string }): void {
    this.server.emit("run.delta", delta);
  }

  emitTrace(trace: { runId: string; stageId: string; text: string }): void {
    this.server.emit("run.trace", trace);
  }

  emitStarted(meta: { runId: string; name: string; pack: string; projectId?: string }): void {
    this.server.emit("run.started", meta);
  }
}
