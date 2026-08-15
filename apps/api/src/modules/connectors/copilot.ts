const CLIENT_ID = "Iv1.b507a08c87ecfe98";
const EDITOR_VERSION = "vscode/1.99.0";
const PLUGIN_VERSION = "copilot-chat/0.26.7";
const USER_AGENT = "GitHubCopilotChat/0.26.7";
const API_VERSION = "2025-04-01";

export interface DeviceCode {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  interval: number;
  expiresIn: number;
}

export interface CopilotSession {
  token: string;
  expiresAt: number;
  endpoint: string;
}

const sessions = new Map<string, CopilotSession>();

export async function requestDeviceCode(): Promise<DeviceCode> {
  const res = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, scope: "read:user" }),
  });
  if (!res.ok) {
    throw new Error(`device code request failed (${res.status})`);
  }
  const data = (await res.json()) as {
    device_code: string;
    user_code: string;
    verification_uri: string;
    interval: number;
    expires_in: number;
  };
  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    interval: data.interval,
    expiresIn: data.expires_in,
  };
}

export async function pollAccessToken(
  deviceCode: string,
): Promise<{ status: "pending" | "authorized"; token?: string }> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      device_code: deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    }),
  });
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (data.access_token) {
    return { status: "authorized", token: data.access_token };
  }
  if (data.error === "authorization_pending" || data.error === "slow_down") {
    return { status: "pending" };
  }
  throw new Error(data.error ?? "authorization failed");
}

function githubHeaders(githubToken: string): Record<string, string> {
  return {
    authorization: `token ${githubToken}`,
    "editor-version": EDITOR_VERSION,
    "editor-plugin-version": PLUGIN_VERSION,
    "user-agent": USER_AGENT,
    "x-github-api-version": API_VERSION,
    accept: "application/json",
  };
}

function copilotHeaders(session: CopilotSession): Record<string, string> {
  return {
    authorization: `Bearer ${session.token}`,
    "content-type": "application/json",
    "copilot-integration-id": "vscode-chat",
    "editor-version": EDITOR_VERSION,
    "editor-plugin-version": PLUGIN_VERSION,
    "user-agent": USER_AGENT,
    "openai-intent": "conversation-panel",
    "x-github-api-version": API_VERSION,
  };
}

export async function getSession(githubToken: string): Promise<CopilotSession> {
  const cached = sessions.get(githubToken);
  if (cached && cached.expiresAt - 60 > Math.floor(Date.now() / 1000)) {
    return cached;
  }
  const res = await fetch("https://api.github.com/copilot_internal/v2/token", {
    headers: githubHeaders(githubToken),
  });
  if (!res.ok) {
    throw new Error(`copilot token exchange failed (${res.status})`);
  }
  const data = (await res.json()) as {
    token: string;
    expires_at: number;
    endpoints?: { api?: string };
  };
  const session: CopilotSession = {
    token: data.token,
    expiresAt: data.expires_at,
    endpoint: data.endpoints?.api ?? "https://api.githubcopilot.com",
  };
  sessions.set(githubToken, session);
  return session;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function streamChat(
  githubToken: string,
  model: string,
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const session = await getSession(githubToken);
  const res = await fetch(`${session.endpoint}/chat/completions`, {
    method: "POST",
    headers: copilotHeaders(session),
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`copilot chat failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let inputTokens = 0;
  let outputTokens = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) {
        continue;
      }
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") {
        continue;
      }
      try {
        const chunk = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          text += delta;
          onDelta(delta);
        }
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens ?? inputTokens;
          outputTokens = chunk.usage.completion_tokens ?? outputTokens;
        }
      } catch {
        continue;
      }
    }
  }
  return { text, inputTokens, outputTokens };
}
