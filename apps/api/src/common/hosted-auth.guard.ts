import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { isHosted } from "./deployment";

const PUBLIC_PATHS = ["/api/health", "/api/whoami", "/api/docs"];

@Injectable()
export class HostedAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!isHosted()) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    if (PUBLIC_PATHS.some((p) => request.path === p || request.path.startsWith(`${p}/`))) {
      return true;
    }
    const expected = process.env.HOSTED_ACCESS_TOKEN;
    if (!expected) {
      throw new UnauthorizedException("Hosted access token is not configured");
    }
    const header = request.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (token !== expected) {
      throw new UnauthorizedException("Invalid or missing access token");
    }
    return true;
  }
}
