import { notificationStore, type NotifLevel } from "@/lib/activity/notifications";

export const notify = {
  success: (title: string, description?: string) =>
    notificationStore.push({ level: "success", title, description }),
  error: (title: string, description?: string) =>
    notificationStore.push({ level: "error", title, description }),
  info: (title: string, description?: string) =>
    notificationStore.push({ level: "info", title, description }),
  warn: (title: string, description?: string) =>
    notificationStore.push({ level: "warn", title, description }),
  push: (input: { level: NotifLevel; title: string; description?: string }) =>
    notificationStore.push(input),
};
