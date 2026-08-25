import { Injectable, Logger } from "@nestjs/common";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Artifact } from "@vcc-workflow/schema";

const run = promisify(execFile);

const safeName = (id: string) => id.replace(/[^A-Za-z0-9._-]/g, "-");

const IDENT = ["-c", "user.name=VCC Workflow", "-c", "user.email=vcc@local"];

@Injectable()
export class WorktreeService {
  private readonly logger = new Logger(WorktreeService.name);

  private async isOwnRepo(root: string): Promise<boolean> {
    try {
      const { stdout } = await run("git", ["-C", root, "rev-parse", "--show-toplevel"]);
      return resolve(stdout.trim()) === resolve(root);
    } catch {
      return false;
    }
  }

  private async hasHead(root: string): Promise<boolean> {
    try {
      await run("git", ["-C", root, "rev-parse", "HEAD"]);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureLocalRepo(root: string): Promise<boolean> {
    const own = await this.isOwnRepo(root);
    if (own && (await this.hasHead(root))) {
      return true;
    }
    if (!own) {
      try {
        await run("git", ["-C", root, "init"]);
        this.logger.log(`Initialised a local git repo at ${root}`);
      } catch (error) {
        this.logger.warn(`git init failed at ${root}: ${String(error)}`);
        return false;
      }
    }
    try {
      const ignore = join(root, ".gitignore");
      if (!existsSync(ignore)) {
        await writeFile(ignore, "node_modules/\ndist/\nbuild/\n.worktrees/\n.vcc-preview/\n");
      }
      await run("git", ["-C", root, "add", "-A"]);
      await run("git", ["-C", root, ...IDENT, "commit", "--allow-empty", "-m", "vcc: initial local snapshot"]);
      return true;
    } catch (error) {
      if (await this.hasHead(root)) {
        return true;
      }
      this.logger.warn(`Initial commit failed at ${root}: ${String(error)}`);
      return false;
    }
  }

  private async addWorktree(root: string, path: string, branch: string): Promise<string> {
    try {
      await run("git", ["-C", root, "worktree", "add", path, "-b", branch]);
    } catch {
      try {
        await run("git", ["-C", root, "worktree", "add", path, branch]);
      } catch {
        this.logger.log(`Reusing existing worktree at ${path}`);
      }
    }
    if (existsSync(path)) {
      return path;
    }
    this.logger.warn(`Worktree not created at ${path}; running in place at ${root}`);
    return root;
  }

  async ensureIsolated(root: string, runId: string): Promise<string | null> {
    if (!(await this.ensureLocalRepo(root))) {
      return root;
    }
    const safe = safeName(runId);
    return this.addWorktree(root, join(root, ".worktrees", safe), `vcc/run/${safe}`);
  }

  async ensure(root: string, itemId: string): Promise<string | null> {
    if (!(await this.ensureLocalRepo(root))) {
      this.logger.warn(`Could not prepare a local git repo at ${root}; running in place.`);
      return root;
    }
    const safe = safeName(itemId);
    return this.addWorktree(root, join(root, ".worktrees", safe), `vcc/item/${safe}`);
  }

  async remove(root: string, worktreePath: string): Promise<void> {
    try {
      await run("git", ["-C", root, "worktree", "remove", "--force", worktreePath]);
    } catch {}
  }

  async changedFiles(worktree: string): Promise<Artifact[]> {
    try {
      const { stdout } = await run("git", ["-C", worktree, "status", "--porcelain", "-uall"]);
      return stdout
        .split("\n")
        .map((line) => line.trimEnd())
        .filter(Boolean)
        .map((line) => {
          const path = line.slice(3).replace(/^"|"$/g, "");
          const name = path.split("/").pop() ?? path;
          const kind = line.startsWith("??") ? "added" : "modified";
          return { name, path, kind };
        })
        .filter((a) => a.name && !a.path.endsWith("/"));
    } catch {
      return [];
    }
  }
}
