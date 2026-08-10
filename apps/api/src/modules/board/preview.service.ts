import { BadRequestException, Injectable } from "@nestjs/common";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import { createServer as netServer } from "node:net";
import { createReadStream, existsSync, statSync } from "node:fs";
import { promises as fs } from "node:fs";
import { extname, join, resolve } from "node:path";
import { connect } from "node:net";
import { PrismaService } from "../../prisma/prisma.service";
import { RunnerService } from "../runner/runner.service";
import { ArtifactsService } from "./artifacts.service";

const PREVIEW_DIR = process.env.VCC_PREVIEW_DIR || join(process.cwd(), "data", "previews");
const PORT_BASE = 43110;
const MAX_LOG = 400;

const PREVIEW_PERSONA =
  "You are a build-and-run expert. Given a produced project (an artifact), you output precise, minimal " +
  "instructions to run it as a local web preview. You never invent scripts that do not exist — you read " +
  "package.json and the file list. You prefer a static build when one is possible.";

export interface PreviewPlan {
  runnable: boolean;
  kind: string;
  install: string;
  build: string;
  serve: string;
  dir: string;
  port: number;
  note: string;
}

interface PreviewState {
  status: "building" | "ready" | "failed" | "stopped";
  url?: string;
  port?: number;
  logs: string[];
  dir: string;
  server?: Server;
  proc?: ChildProcess;
}

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

@Injectable()
export class PreviewService {
  private readonly previews = new Map<string, PreviewState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly artifactSvc: ArtifactsService,
    private readonly runner: RunnerService,
  ) {}

  private async resolveRunDir(dir: string): Promise<string> {
    const runnable = (d: string) =>
      existsSync(join(d, "package.json")) || existsSync(join(d, "index.html"));
    if (runnable(dir)) {
      return dir;
    }
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith(".") || e.name === "node_modules") {
        continue;
      }
      const sub = join(dir, e.name);
      if (runnable(sub)) {
        return sub;
      }
    }
    return dir;
  }

  async evaluate(inputDir: string): Promise<PreviewPlan> {
    const dir = await this.resolveRunDir(inputDir);
    const entries = (await fs.readdir(dir, { withFileTypes: true }).catch(() => []))
      .slice(0, 60)
      .map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
    const packageJson = (await fs.readFile(join(dir, "package.json"), "utf8").catch(() => "")).slice(0, 4000);
    const readme = (await fs.readFile(join(dir, "README.md"), "utf8").catch(() => "")).slice(0, 800);

    const ai = await this.aiPlan(entries, packageJson, readme);
    return ai ?? this.heuristicPlan(entries, packageJson);
  }

  private async aiPlan(files: string[], packageJson: string, readme: string): Promise<PreviewPlan | null> {
    const instruction = [
      "Decide how to run this produced project as a local web preview.",
      "Output ONLY JSON: {runnable:boolean, kind:string, install:string, build:string, serve:string, dir:string, port:number, note:string}. No prose, no code fences.",
      "Rules:",
      "- install: shell command to install dependencies, or empty.",
      "- Prefer a STATIC build: set build (e.g. \"npm run build\") and dir (the folder to serve, e.g. \"dist\",\"build\",\"out\",\"public\",\".\"); leave serve empty.",
      "- Only if there is no static build (it needs a running server): set serve to a command that starts a server bound to the port in the PORT environment variable (use $PORT for a flag, e.g. \"npm run dev -- --port $PORT\" or \"node server.js\"); set port to that server's default; leave build/dir empty.",
      "- A plain static site with index.html: install/build/serve empty, dir \".\".",
      "- Only reference scripts that actually exist in package.json. If it cannot run as a web preview, set runnable false.",
    ].join("\n");
    try {
      const { text } = await this.runner.runAiSession({
        name: "Preview plan",
        pack: "ai-preview",
        agent: "planner",
        action: "preview",
        instruction,
        persona: PREVIEW_PERSONA,
        model: "sonnet",
        input: { files, packageJson, readme },
      });
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start === -1 || end === -1) return null;
      const raw = JSON.parse(text.slice(start, end + 1)) as Partial<PreviewPlan>;
      return {
        runnable: Boolean(raw.runnable),
        kind: typeof raw.kind === "string" ? raw.kind : "web",
        install: typeof raw.install === "string" ? raw.install : "",
        build: typeof raw.build === "string" ? raw.build : "",
        serve: typeof raw.serve === "string" ? raw.serve : "",
        dir: typeof raw.dir === "string" && raw.dir ? raw.dir : ".",
        port: typeof raw.port === "number" ? raw.port : 0,
        note: typeof raw.note === "string" ? raw.note : "",
      };
    } catch {
      return null;
    }
  }

  private heuristicPlan(entries: string[], packageJson: string): PreviewPlan {
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson) as {
          scripts?: Record<string, string>;
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        const scripts = pkg.scripts ?? {};
        if (typeof scripts.build === "string") {
          const dir = deps.next ? "out" : deps["react-scripts"] ? "build" : "dist";
          return {
            runnable: true,
            kind: "web",
            install: "npm install",
            build: "npm run build",
            serve: "",
            dir,
            port: 0,
            note: `Web app (build script present). Serving ${dir} after build.`,
          };
        }
      } catch {
        /* ignore */
      }
    }
    if (entries.includes("index.html")) {
      return { runnable: true, kind: "static", install: "", build: "", serve: "", dir: ".", port: 0, note: "Static site." };
    }
    return { runnable: false, kind: "none", install: "", build: "", serve: "", dir: ".", port: 0, note: "No runnable web output detected." };
  }

  status(cardId: string) {
    const s = this.previews.get(cardId);
    if (!s) {
      return { status: "idle" as const, url: null, logs: [] as string[] };
    }
    return { status: s.status, url: s.url ?? null, logs: s.logs.slice(-40) };
  }

  async start(cardId: string, artifactId?: string) {
    await this.stop(cardId);
    const artifact = artifactId
      ? await this.prisma.artifact.findUnique({ where: { id: artifactId } })
      : await this.prisma.artifact.findFirst({
          where: { cardId },
          orderBy: { createdAt: "desc" },
        });
    let plan: PreviewPlan;
    let dir: string;
    if (artifact) {
      dir = join(PREVIEW_DIR, cardId);
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
      if (existsSync(artifact.path) && statSync(artifact.path).isDirectory()) {
        dir = artifact.path;
      } else {
        await this.artifactSvc.unpack(artifact.path, dir);
      }
      const saved = JSON.parse(artifact.preview || "{}") as PreviewPlan;
      plan = saved.runnable ? saved : await this.evaluate(dir);
    } else {
      const card = await this.prisma.boardCard.findUnique({
        where: { id: cardId },
        select: { worktree: true },
      });
      if (!card?.worktree) {
        throw new BadRequestException("Nothing to run yet — no artifact or workspace for this task.");
      }
      dir = await this.resolveRunDir(card.worktree);
      plan = await this.evaluate(dir);
    }
    if (!plan.runnable) {
      throw new BadRequestException("This task didn't produce a runnable web app.");
    }
    const state: PreviewState = { status: "building", logs: [], dir };
    this.previews.set(cardId, state);
    void this.build(state, plan, dir);
    return this.status(cardId);
  }

  async stop(cardId: string) {
    const s = this.previews.get(cardId);
    if (s) {
      s.server?.close();
      s.proc?.kill();
      s.status = "stopped";
      this.previews.delete(cardId);
    }
    return { status: "stopped" as const };
  }

  private log(state: PreviewState, line: string) {
    state.logs.push(line);
    if (state.logs.length > MAX_LOG) {
      state.logs.splice(0, state.logs.length - MAX_LOG);
    }
  }

  private async build(state: PreviewState, plan: PreviewPlan, dir: string): Promise<void> {
    try {
      if (plan.install) {
        const code = await this.runCmd(plan.install, dir, state);
        if (code !== 0) throw new Error(`install exited ${code}`);
      }

      if (plan.serve) {
        const port = await this.freePort();
        const cmd = plan.serve.replace(/\$PORT|%PORT%|\{PORT\}/g, String(port));
        this.log(state, `$ ${cmd}  (PORT=${port})`);
        const proc = spawn(cmd, {
          cwd: dir,
          shell: true,
          env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", BROWSER: "none" },
        });
        state.proc = proc;
        proc.stdout?.on("data", (d: Buffer) => this.log(state, d.toString().trimEnd()));
        proc.stderr?.on("data", (d: Buffer) => this.log(state, d.toString().trimEnd()));
        proc.on("error", (e) => this.log(state, String(e)));
        const up = await this.waitForPort(port, 90_000);
        if (!up) throw new Error("The server did not start on the expected port.");
        state.port = port;
        state.url = `http://localhost:${port}`;
        state.status = "ready";
        this.log(state, `Server ready at ${state.url}`);
        return;
      }

      if (plan.build) {
        const code = await this.runCmd(plan.build, dir, state);
        if (code !== 0) throw new Error(`build exited ${code}`);
      }
      const serveDir = resolve(join(dir, plan.dir || "."));
      if (!existsSync(serveDir)) {
        throw new Error(`Build output "${plan.dir}" not found.`);
      }
      const port = await this.freePort();
      state.server = this.serveStatic(serveDir, port);
      state.port = port;
      state.url = `http://localhost:${port}`;
      state.status = "ready";
      this.log(state, `Serving ${plan.dir} at ${state.url}`);
    } catch (error) {
      state.status = "failed";
      this.log(state, `Preview failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private waitForPort(port: number, timeoutMs: number): Promise<boolean> {
    const attempt = () =>
      new Promise<boolean>((res) => {
        const sock = connect(port, "127.0.0.1");
        sock.once("connect", () => {
          sock.destroy();
          res(true);
        });
        sock.once("error", () => {
          sock.destroy();
          res(false);
        });
      });
    return (async () => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (await attempt()) return true;
        await new Promise((r) => setTimeout(r, 700));
      }
      return false;
    })();
  }

  private runCmd(cmd: string, cwd: string, state: PreviewState): Promise<number> {
    return new Promise((resolvePromise) => {
      this.log(state, `$ ${cmd}`);
      const proc = spawn(cmd, { cwd, shell: true, env: process.env });
      state.proc = proc;
      proc.stdout?.on("data", (d: Buffer) => this.log(state, d.toString().trimEnd()));
      proc.stderr?.on("data", (d: Buffer) => this.log(state, d.toString().trimEnd()));
      proc.on("close", (code) => resolvePromise(code ?? 1));
      proc.on("error", (e) => {
        this.log(state, String(e));
        resolvePromise(1);
      });
    });
  }

  private freePort(): Promise<number> {
    const tryPort = (port: number): Promise<boolean> =>
      new Promise((res) => {
        const srv = netServer();
        srv.once("error", () => res(false));
        srv.once("listening", () => srv.close(() => res(true)));
        srv.listen(port, "127.0.0.1");
      });
    return (async () => {
      for (let port = PORT_BASE; port < PORT_BASE + 200; port++) {
        if (await tryPort(port)) return port;
      }
      throw new Error("No free port for preview");
    })();
  }

  private serveStatic(root: string, port: number): Server {
    const server = createServer((req, res) => {
      try {
        const rel = decodeURIComponent((req.url || "/").split("?")[0]);
        let file = resolve(join(root, rel));
        if (!file.startsWith(root)) {
          res.writeHead(403);
          res.end("Forbidden");
          return;
        }
        if (existsSync(file) && statSync(file).isDirectory()) {
          file = join(file, "index.html");
        }
        if (!existsSync(file)) {
          file = join(root, "index.html");
        }
        if (!existsSync(file)) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "content-type": MIME[extname(file).toLowerCase()] || "application/octet-stream" });
        createReadStream(file).pipe(res);
      } catch {
        res.writeHead(500);
        res.end("Preview error");
      }
    });
    server.listen(port, "127.0.0.1");
    return server;
  }
}
