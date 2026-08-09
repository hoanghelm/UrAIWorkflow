import { Injectable, Logger } from "@nestjs/common";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import type { Artifact } from "@vcc-workflow/schema";

const run = promisify(execFile);

@Injectable()
export class WorktreeService {
  private readonly logger = new Logger(WorktreeService.name);

  async ensure(root: string, itemId: string): Promise<string | null> {
    try {
      await run("git", ["-C", root, "rev-parse", "--is-inside-work-tree"]);
    } catch {
      this.logger.warn(`Project root is not a git repository: ${root}`);
      return null;
    }
    const path = join(root, ".worktrees", itemId);
    const branch = `vcc/item/${itemId}`;
    try {
      await run("git", ["-C", root, "worktree", "add", path, "-b", branch]);
    } catch {
      try {
        await run("git", ["-C", root, "worktree", "add", path, branch]);
      } catch {
        this.logger.log(`Reusing existing worktree at ${path}`);
      }
    }
    return path;
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
