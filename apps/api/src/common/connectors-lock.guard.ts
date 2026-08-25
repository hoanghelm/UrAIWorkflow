import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { connectorsLocked } from "./server-policy";

@Injectable()
export class ConnectorsLockGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!connectorsLocked()) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method === "GET") {
      return true;
    }
    if (request.method === "POST" && request.path.endsWith("/test")) {
      return true;
    }
    throw new ForbiddenException("Connectors are managed by the server host.");
  }
}
