import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export const ALL_MODEL_OPTIONS = [
  { value: "opus", label: "Opus" },
  { value: "sonnet", label: "Sonnet" },
  { value: "haiku", label: "Haiku" },
];

export const PROVIDER_LABEL: Record<string, string> = {
  "claude-agent": "Claude subscription",
  claude: "Anthropic API key (BYOK)",
  copilot: "GitHub Copilot",
};

export function useServerConfig() {
  return useQuery({
    queryKey: ["server-config"],
    queryFn: () => api.serverConfig(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useModelOptions() {
  const { data } = useServerConfig();
  const allowed = data?.allowedModels;
  if (!allowed || allowed.length === 0) {
    return ALL_MODEL_OPTIONS;
  }
  return ALL_MODEL_OPTIONS.filter((o) => allowed.includes(o.value));
}
