import { test } from "node:test";
import assert from "node:assert/strict";
import { HostedAuthGuard } from "./hosted-auth.guard";

function ctx(path: string, authorization?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ path, headers: authorization ? { authorization } : {} }),
    }),
  } as never;
}

const guard = new HostedAuthGuard();

test("local mode allows everything without a token", () => {
  delete process.env.DEPLOYMENT_MODE;
  assert.equal(guard.canActivate(ctx("/api/connectors")), true);
});

test("hosted mode rejects missing token but allows health", () => {
  process.env.DEPLOYMENT_MODE = "hosted";
  process.env.HOSTED_ACCESS_TOKEN = "secret";
  assert.equal(guard.canActivate(ctx("/api/health")), true);
  assert.throws(() => guard.canActivate(ctx("/api/connectors")));
  assert.throws(() => guard.canActivate(ctx("/api/connectors", "Bearer wrong")));
});

test("hosted mode allows the correct bearer token", () => {
  process.env.DEPLOYMENT_MODE = "hosted";
  process.env.HOSTED_ACCESS_TOKEN = "secret";
  assert.equal(guard.canActivate(ctx("/api/connectors", "Bearer secret")), true);
  delete process.env.DEPLOYMENT_MODE;
});
