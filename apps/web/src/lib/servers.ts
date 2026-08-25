export interface ServerConfig {
  id: string;
  name: string;
  url: string;
  token: string;
}

const LOCAL: ServerConfig = { id: "local", name: "This computer", url: "", token: "" };
const KEY = "vcc-servers";
const ACTIVE = "vcc-active-server";

function customServers(): ServerConfig[] {
  try {
    return (JSON.parse(localStorage.getItem(KEY) || "[]") as ServerConfig[]).filter((s) => s.id !== "local");
  } catch {
    return [];
  }
}

export function getServers(): ServerConfig[] {
  return [LOCAL, ...customServers()];
}

export function getActiveServer(): ServerConfig {
  const id = localStorage.getItem(ACTIVE) || "local";
  return getServers().find((s) => s.id === id) ?? LOCAL;
}

export function setActiveServer(id: string): void {
  localStorage.setItem(ACTIVE, id);
  window.location.reload();
}

export function saveServer(server: ServerConfig): void {
  const list = customServers().filter((s) => s.id !== server.id);
  localStorage.setItem(KEY, JSON.stringify([...list, server]));
}

export function removeServer(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(customServers().filter((s) => s.id !== id)));
  if ((localStorage.getItem(ACTIVE) || "local") === id) {
    setActiveServer("local");
  }
}

const trimUrl = (url: string) => url.replace(/\/+$/, "");

export function apiBaseUrl(): string {
  const s = getActiveServer();
  return s.url ? `${trimUrl(s.url)}/api` : "/api";
}

export function wsBaseUrl(): string {
  const s = getActiveServer();
  return s.url ? trimUrl(s.url) : (import.meta.env.VITE_WS_URL ?? "http://localhost:3001");
}

export function authToken(): string {
  return getActiveServer().token;
}

export async function testServer(
  url: string,
  token: string,
): Promise<{ ok: boolean; mode?: string; authRequired?: boolean; error?: string }> {
  try {
    const base = url ? trimUrl(url) : "";
    const res = await fetch(`${base}/api/whoami`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { mode?: string; authRequired?: boolean };
    return { ok: true, mode: data.mode, authRequired: data.authRequired };
  } catch {
    return { ok: false, error: "unreachable" };
  }
}
