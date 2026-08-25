export type NotifLevel = "success" | "info" | "warn" | "error";

export interface AppNotification {
  id: string;
  level: NotifLevel;
  title: string;
  description?: string;
  runId?: string;
  at: number;
  toast: boolean;
  read: boolean;
}

const TTL: Record<NotifLevel, number> = {
  success: 3000,
  info: 4000,
  warn: 6000,
  error: 9000,
};

let list: AppNotification[] = [];
const subs = new Set<() => void>();
const emit = () => subs.forEach((fn) => fn());
const nextId = () => `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function push(input: { level: NotifLevel; title: string; description?: string; runId?: string }): string {
  const item: AppNotification = {
    id: nextId(),
    level: input.level,
    title: input.title,
    description: input.description,
    runId: input.runId,
    at: Date.now(),
    toast: true,
    read: false,
  };
  list = [item, ...list].slice(0, 100);
  emit();
  setTimeout(() => dismissToast(item.id), TTL[input.level]);
  return item.id;
}

function dismissToast(id: string) {
  list = list.map((n) => (n.id === id ? { ...n, toast: false } : n));
  emit();
}

function remove(id: string) {
  list = list.filter((n) => n.id !== id);
  emit();
}

function markAllRead() {
  list = list.map((n) => ({ ...n, read: true }));
  emit();
}

function clear() {
  list = [];
  emit();
}

export const notificationStore = {
  push,
  dismissToast,
  remove,
  markAllRead,
  clear,
  subscribe: (fn: () => void) => {
    subs.add(fn);
    return () => subs.delete(fn);
  },
  getSnapshot: () => list,
};
