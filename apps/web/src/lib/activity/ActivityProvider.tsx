import { useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { onRunEvent, onRunStarted, onBoardChanged, onReconnect } from "@/lib/ws";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { api } from "@/lib/api";
import { taskStore } from "./tasks";
import { outputStore } from "./output";
import { notificationStore } from "./notifications";

export function ActivityProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const currentId = useAppSelector((s) => s.projects.currentId);
  const currentIdRef = useRef<string | null>(currentId);
  currentIdRef.current = currentId;

  useEffect(() => {
    const refreshLists = () => {
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
      void queryClient.invalidateQueries({ queryKey: ["board"] });
      void queryClient.invalidateQueries({ queryKey: ["board-activity"] });
      void queryClient.invalidateQueries({ queryKey: ["board-runs"] });
      void queryClient.invalidateQueries({ queryKey: ["project-summaries"] });
      void dispatch.runs.load(currentIdRef.current ?? undefined);
    };

    const seedActiveTasks = async () => {
      try {
        const runs = await api.runs(currentIdRef.current ?? undefined);
        for (const r of runs) {
          if (r.status === "running" || r.status === "needs_input") {
            taskStore.start({ runId: r.id, name: r.name, pack: r.pack });
            taskStore.setStatus(r.id, r.status);
          }
        }
      } catch {}
    };
    void seedActiveTasks();
    const offReconnect = onReconnect(() => void seedActiveTasks());

    const offBoard = onBoardChanged(() => {
      void queryClient.invalidateQueries({ queryKey: ["board"] });
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
      void queryClient.invalidateQueries({ queryKey: ["board-activity"] });
      void queryClient.invalidateQueries({ queryKey: ["board-runs"] });
    });

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
        if (event.status === "failed") {
          const task = taskStore.getSnapshot().find((t) => t.runId === event.runId);
          notificationStore.push({
            level: "error",
            title: `${task?.title ?? "Run"} failed`,
            description: event.message,
            runId: event.runId,
          });
          taskStore.remove(event.runId);
        } else {
          taskStore.setStatus(event.runId, event.status);
        }
      }
      refreshLists();
    });
    return () => {
      offStarted();
      offEvent();
      offBoard();
      offReconnect();
    };
  }, [queryClient, dispatch]);

  return <>{children}</>;
}
