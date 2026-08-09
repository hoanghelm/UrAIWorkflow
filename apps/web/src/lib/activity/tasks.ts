export interface ActivityTask {
  runId: string;
  title: string;
  pack: string;
  status: string;
  at: number;
}

const TERMINAL = new Set(["done", "failed"]);

let tasks: ActivityTask[] = [];
const subs = new Set<() => void>();
const emit = () => subs.forEach((fn) => fn());

function start(meta: { runId: string; name: string; pack: string }) {
  if (tasks.some((t) => t.runId === meta.runId)) {
    return;
  }
  tasks = [
    { runId: meta.runId, title: meta.name, pack: meta.pack, status: "running", at: Date.now() },
    ...tasks,
  ];
  emit();
}

function setStatus(runId: string, status: string) {
  const existing = tasks.find((t) => t.runId === runId);
  if (!existing) {
    tasks = [{ runId, title: runId, pack: "", status, at: Date.now() }, ...tasks];
  } else {
    tasks = tasks.map((t) => (t.runId === runId ? { ...t, status } : t));
  }
  emit();
  if (TERMINAL.has(status)) {
    setTimeout(() => remove(runId), 15000);
  }
}

function remove(runId: string) {
  tasks = tasks.filter((t) => t.runId !== runId);
  emit();
}

export const taskStore = {
  start,
  setStatus,
  remove,
  runningCount: () => tasks.filter((t) => t.status === "running" || t.status === "needs_input").length,
  subscribe: (fn: () => void) => {
    subs.add(fn);
    return () => subs.delete(fn);
  },
  getSnapshot: () => tasks,
};
