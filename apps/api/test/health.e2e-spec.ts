import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { AppModule } from "../src/app.module";

test("GET /health returns 200 with status ok and db up", async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication = moduleRef.createNestApplication();
  await app.init();
  await app.listen(0);

  try {
    const address = app.getHttpServer().address();
    const port = typeof address === "object" && address ? address.port : 0;
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.db, "up");
    assert.equal(typeof body.uptimeSeconds, "number");
    assert.equal(typeof body.timestamp, "string");
  } finally {
    await app.close();
  }
});
