import { accessSync, constants } from "node:fs";
import { execSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

let cached: string | null | undefined;

function exists(path: string): boolean {
  try {
    accessSync(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function detect(): string | null {
  const override =
    process.env.CLAUDE_CODE_EXECUTABLE || process.env.CLAUDE_CODE_EXECUTABLE_PATH;
  if (override && exists(override)) {
    return override;
  }

  const win = process.platform === "win32";
  const bin = win ? "claude.exe" : "claude";
  const home = homedir();
  const candidates = [
    join(home, ".local", "bin", bin),
    join(home, ".claude", "local", bin),
  ];
  for (const candidate of candidates) {
    if (exists(candidate)) {
      return candidate;
    }
  }

  try {
    const cmd = win ? "where claude" : "command -v claude";
    const out = execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim()
      .split(/\r?\n/)[0];
    if (out && exists(out)) {
      return out;
    }
  } catch {
    /* not on PATH */
  }

  return null;
}

export function resolveClaudeExecutable(): string | undefined {
  if (cached === undefined) {
    cached = detect();
  }
  return cached ?? undefined;
}

let cachedBash: string | null | undefined;

function isGitBash(path: string): boolean {
  return /\\git\\/i.test(path) && !/system32/i.test(path) && !/windowsapps/i.test(path);
}

function detectGitBash(): string | null {
  const override = process.env.CLAUDE_CODE_GIT_BASH_PATH;
  if (override && exists(override)) {
    return override;
  }

  try {
    const gitPath = execSync("where git", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .split(/\r?\n/)[0]
      .trim();
    const root = gitPath.match(/^(.*\\Git)\\/i)?.[1];
    if (root) {
      const candidate = join(root, "bin", "bash.exe");
      if (exists(candidate)) {
        return candidate;
      }
    }
  } catch {
    /* git not on PATH */
  }

  try {
    const lines = execSync("where bash", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const gitBash = lines.find(isGitBash);
    if (gitBash && exists(gitBash)) {
      return gitBash;
    }
  } catch {
    /* bash not on PATH */
  }

  for (const candidate of [
    "C:\\Program Files\\Git\\bin\\bash.exe",
    "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
  ]) {
    if (exists(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function resolveGitBash(): string | undefined {
  if (cachedBash === undefined) {
    cachedBash = detectGitBash();
  }
  return cachedBash ?? undefined;
}

export function ensureAgentEnv(): void {
  if (process.platform === "win32" && !process.env.CLAUDE_CODE_GIT_BASH_PATH) {
    const bash = resolveGitBash();
    if (bash) {
      process.env.CLAUDE_CODE_GIT_BASH_PATH = bash;
    }
  }
}
