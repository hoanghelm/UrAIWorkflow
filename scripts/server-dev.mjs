import { spawn, spawnSync } from "node:child_process";

const winShell = process.platform === "win32";
const DATABASE_URL = "postgresql://vcc:vcc@localhost:5432/vcc";
const TOKEN = process.env.HOSTED_ACCESS_TOKEN || "dev-token";
const env = {
  ...process.env,
  DEPLOYMENT_MODE: "hosted",
  DATABASE_URL,
  HOSTED_ACCESS_TOKEN: TOKEN,
};

function step(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: winShell, env });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const dockerUp = spawnSync("docker", ["info"], { stdio: "ignore", shell: winShell });
if (dockerUp.status !== 0) {
  console.error("Docker is not running. Start Docker Desktop (or the daemon) and retry.");
  process.exit(1);
}

console.log("Starting local PostgreSQL...");
step("docker", ["compose", "-f", "docker-compose.db.yml", "up", "-d"]);

process.stdout.write("Waiting for PostgreSQL to accept connections");
let ready = false;
for (let i = 0; i < 30; i += 1) {
  const probe = spawnSync(
    "docker",
    ["exec", "uraiworkflow-db", "pg_isready", "-U", "vcc", "-d", "vcc"],
    { stdio: "ignore", shell: winShell },
  );
  if (probe.status === 0) {
    ready = true;
    break;
  }
  process.stdout.write(".");
  await sleep(1000);
}
console.log(ready ? " ready" : " timed out");
if (!ready) {
  console.error("PostgreSQL did not become ready. Check: docker compose -f docker-compose.db.yml logs");
  process.exit(1);
}

step("pnpm", ["--filter", "@vcc-workflow/schema", "build"]);
step("pnpm", ["--filter", "@vcc-workflow/api", "prisma:pg:generate"]);
step("pnpm", ["--filter", "@vcc-workflow/api", "prisma:pg:deploy"]);

console.log("\nServer mode (hosted) on local PostgreSQL:");
console.log(`  Database: ${DATABASE_URL}`);
console.log(`  Auth:     send header  Authorization: Bearer ${TOKEN}`);
console.log("  Web http://localhost:5173  ·  API http://localhost:3001/api/docs\n");

const dev = spawn("pnpm", ["dev"], { stdio: "inherit", shell: winShell, env });
dev.on("exit", (code) => process.exit(code ?? 0));
