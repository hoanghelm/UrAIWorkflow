import { isHosted } from "./deployment";

const ALL_MODELS = ["opus", "sonnet", "haiku"];
const ALL_PROVIDERS = ["claude-agent", "claude", "copilot"];

function fromEnv(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : fallback;
}

export function allowedModels(): string[] {
  return fromEnv("ALLOWED_MODELS", ALL_MODELS).filter((m) => ALL_MODELS.includes(m));
}

export function allowedProviders(): string[] {
  return fromEnv("ALLOWED_PROVIDERS", ALL_PROVIDERS).filter((p) => ALL_PROVIDERS.includes(p));
}

export function connectorsLocked(): boolean {
  if (!isHosted()) {
    return false;
  }
  return process.env.CONNECTORS_LOCKED !== "false";
}

export function resolveAllowedModel(tier: string): string {
  const allowed = allowedModels();
  return allowed.includes(tier) ? tier : (allowed[0] ?? tier);
}

export function serverPolicy() {
  return {
    allowedModels: allowedModels(),
    allowedProviders: allowedProviders(),
    connectorsLocked: connectorsLocked(),
  };
}
