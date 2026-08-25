import { WebSocketGateway, WebSocketServer, type OnGatewayConnection } from "@nestjs/websockets";
import { Server, type Socket } from "socket.io";
import type { RunEvent } from "@vcc-workflow/schema";
import { isHosted } from "../../common/deployment";

@WebSocketGateway({ cors: { origin: true }, namespace: "/runs" })
export class RunnerGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    if (!isHosted()) {
      return;
    }
    const token = (client.handshake.auth?.token as string | undefined) ?? "";
    const expected = process.env.HOSTED_ACCESS_TOKEN;
    if (!expected || token !== expected) {
      client.disconnect(true);
    }
  }

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

  emitBoardChanged(projectId?: string): void {
    this.server.emit("board.changed", { projectId });
  }
}
