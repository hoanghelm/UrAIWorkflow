import { useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { onRunEvent, onRunStarted } from "@/lib/ws";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { taskStore } from "./tasks";
import { outputStore } from "./output";

export function ActivityProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const currentId = useAppSelector((s) => s.projects.currentId);
  const currentIdRef = useRef<string | null>(currentId);
  currentIdRef.current = currentId;

  useEffect(() => {
    const refreshLists = () => {
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
      void queryClient.invalidateQueries({ queryKey: ["project-summaries"] });
      void dispatch.runs.load(currentIdRef.current ?? undefined);
    };

    const offStarted = onRunStarted((meta) => {
      taskStore.start(meta);
      outputStore.append(meta.runId, {
        at: new Date().toISOString(),
        level: "info",
        message: `Started ${meta.name} (${meta.pack})`,
      });
      refreshLists();
    });
    const offEvent = onRunEvent((event) => {
      outputStore.append(event.runId, {
        at: event.at,
        level: event.level,
        message: event.message,
      });
      if (event.status) {
        taskStore.setStatus(event.runId, event.status);
        refreshLists();
      }
    });
    return () => {
      offStarted();
      offEvent();
    };
  }, [queryClient, dispatch]);

  return <>{children}</>;
}
