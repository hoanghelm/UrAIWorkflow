import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export const useMarketplaceQuery = () =>
  useQuery({ queryKey: ["marketplace"], queryFn: api.marketplace });

export const useProjectSummariesQuery = () =>
  useQuery({ queryKey: ["project-summaries"], queryFn: api.projectSummaries });

export const usePersonasQuery = () =>
  useQuery({ queryKey: ["ai-personas"], queryFn: api.aiPersonas });

export const usePacksQuery = () => useQuery({ queryKey: ["packs"], queryFn: api.packs });

export const usePackQuery = (name: string) =>
  useQuery({ queryKey: ["pack", name], queryFn: () => api.pack(name), enabled: Boolean(name) });

export const useRunsQuery = (projectId?: string) =>
  useQuery({
    queryKey: ["runs", projectId],
    queryFn: () => api.runs(projectId),
    enabled: Boolean(projectId),
  });

export const useAllRunsQuery = () =>
  useQuery({ queryKey: ["runs", "all"], queryFn: () => api.runs() });
