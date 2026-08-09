import { useEffect, useRef, useSyncExternalStore } from "react";
import { notificationStore } from "./notifications";
import { taskStore } from "./tasks";
import { outputStore } from "./output";
import { aiBuilderStore } from "./aiBuilder";

export function useNotifications() {
  return useSyncExternalStore(notificationStore.subscribe, notificationStore.getSnapshot);
}

export function useTasks() {
  return useSyncExternalStore(taskStore.subscribe, taskStore.getSnapshot);
}

export function useOutput() {
  return useSyncExternalStore(outputStore.subscribe, outputStore.getSnapshot);
}

export function useAiBuilderTarget() {
  return useSyncExternalStore(aiBuilderStore.subscribe, aiBuilderStore.getSnapshot);
}

export function useRegisterAiBuilder(label: string, open: () => void, enabled = true) {
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => {
    if (!enabled) {
      aiBuilderStore.clear();
      return;
    }
    aiBuilderStore.set({ label, open: () => openRef.current() });
    return () => aiBuilderStore.clear();
  }, [label, enabled]);
}
