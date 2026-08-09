import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  Empty,
  RunStatusPill,
  BellOutlined,
  SyncOutlined,
  ProfileOutlined,
  CodeOutlined,
  CloseOutlined,
  DownOutlined,
  StopOutlined,
  notify,
} from "@/components/ui";
import { taskStore } from "@/lib/activity/tasks";
import { UsageWidget } from "@/features/usage/ModelsUsageFab";
import { ThemeToggle } from "@/components/ui";
import { useTasks, useNotifications, useOutput } from "@/lib/activity/hooks";
import { notificationStore, type AppNotification } from "@/lib/activity/notifications";
import { outputStore } from "@/lib/activity/output";
import type { ActivityTask } from "@/lib/activity/tasks";
import { api } from "@/lib/api";
import { onReconnect } from "@/lib/ws";
import { LEVEL_META } from "./levelMeta";

type Panel = "tasks" | "output" | "notifications" | null;

const barBtn =
  "flex h-full items-center gap-1.5 px-2 hover:bg-black/10 dark:hover:bg-white/10";

function TasksPanel({
  tasks,
  onOpen,
  onStop,
}: {
  tasks: ActivityTask[];
  onOpen: (id: string) => void;
  onStop: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-8 right-3 z-50 w-96 overflow-hidden rounded-lg border border-line bg-surface shadow-2xl">
      <div className="border-b border-line px-3 py-2 text-sm font-semibold text-fg">Tasks</div>
      <div className="max-h-80 overflow-auto p-2">
        {tasks.length === 0 ? (
          <div className="py-4">
            <Empty description="No active tasks." />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {tasks.map((t) => {
              const active = t.status === "running" || t.status === "needs_input";
              return (
                <div
                  key={t.runId}
                  onClick={() => onOpen(t.runId)}
                  className="group flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {t.status === "running" ? (
                      <SyncOutlined spin className="text-accent" />
                    ) : (
                      <ProfileOutlined className="text-faint" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-fg">{t.title}</span>
                      {t.pack && <span className="block text-xs text-faint">{t.pack}</span>}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <RunStatusPill status={t.status} />
                    {active && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStop(t.runId);
                        }}
                        title="Stop"
                        aria-label="Stop"
                        className="flex h-6 w-6 items-center justify-center rounded text-faint opacity-0 transition hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
                      >
                        <StopOutlined />
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function OutputPanel({ tasks }: { tasks: ActivityTask[] }) {
  const output = useOutput();
  const runIds = Array.from(new Set([...tasks.map((t) => t.runId), ...Object.keys(output)]));
  const options = runIds.map((id) => ({
    value: id,
    label: tasks.find((t) => t.runId === id)?.title ?? id,
  }));
  const [sel, setSel] = useState<string | null>(null);
  const active = sel ?? options[0]?.value ?? null;
  const lines = active ? output[active] ?? [] : [];
  const bodyRef = useRef<HTMLDivElement>(null);
  const backfilled = useRef<Set<string>>(new Set());

  const backfill = (id: string) => {
    void api.runEvents(id).then((events) => {
      outputStore.seed(
        id,
        events.map((e) => ({ at: e.at, level: e.level, message: e.message })),
      );
    });
  };

  useEffect(() => {
    if (active && !backfilled.current.has(active)) {
      backfilled.current.add(active);
      backfill(active);
    }
  }, [active]);

  useEffect(() => {
    const off = onReconnect(() => {
      if (active) {
        backfill(active);
      }
    });
    return off;
  }, [active]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [lines.length, active]);

  return (
    <div className="fixed bottom-8 right-3 z-50 w-[560px] overflow-hidden rounded-lg border border-line bg-surface shadow-2xl">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className="text-sm font-semibold text-fg">Output</span>
        <Select
          value={active ?? undefined}
          options={options}
          onChange={(v) => setSel(v as string)}
          placeholder="Select a run"
          size="small"
          style={{ width: 320, marginLeft: "auto" }}
        />
      </div>
      <div
        ref={bodyRef}
        className="h-64 overflow-auto bg-black/50 px-3 py-2 font-mono text-xs leading-relaxed"
      >
        {lines.length === 0 ? (
          <div className="text-faint">No output yet.</div>
        ) : (
          lines.map((l, i) => (
            <div
              key={i}
              className={
                l.level === "error"
                  ? "text-red-400"
                  : l.level === "warn"
                    ? "text-amber-400"
                    : "text-gray-300"
              }
            >
              <span className="text-gray-500">{new Date(l.at).toLocaleTimeString()} </span>
              {l.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NotifRow({ n }: { n: AppNotification }) {
  const [open, setOpen] = useState(false);
  const meta = LEVEL_META[n.level];
  return (
    <div className="rounded-md px-2 py-1.5 hover:bg-surface-2">
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 ${meta.color}`}>{meta.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <span className="flex-1 break-words text-sm text-fg">{n.title}</span>
            <span className="shrink-0 text-xs text-faint">
              {new Date(n.at).toLocaleTimeString()}
            </span>
            {n.description && (
              <button onClick={() => setOpen((o) => !o)} className="text-faint hover:text-fg">
                <DownOutlined className={`text-[10px] transition-transform ${open ? "" : "-rotate-90"}`} />
              </button>
            )}
          </div>
          {n.description && open && (
            <p className="mt-1 whitespace-pre-wrap break-words text-xs text-muted">{n.description}</p>
          )}
        </div>
        <button onClick={() => notificationStore.remove(n.id)} className="text-faint hover:text-fg">
          <CloseOutlined className="text-[11px]" />
        </button>
      </div>
    </div>
  );
}

function NotificationCenter({ list }: { list: AppNotification[] }) {
  return (
    <div className="fixed bottom-8 right-3 z-50 w-96 overflow-hidden rounded-lg border border-line bg-surface shadow-2xl">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="text-sm font-semibold text-fg">Notifications</span>
        {list.length > 0 && (
          <button onClick={() => notificationStore.clear()} className="text-xs text-accent">
            Clear all
          </button>
        )}
      </div>
      <div className="max-h-96 overflow-auto p-2">
        {list.length === 0 ? (
          <div className="py-4">
            <Empty description="No notifications." />
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {list.map((n) => (
              <NotifRow key={n.id} n={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ActivityBar() {
  const navigate = useNavigate();
  const tasks = useTasks();
  const notifs = useNotifications();
  const [panel, setPanel] = useState<Panel>(null);

  const running = tasks.filter((t) => t.status === "running" || t.status === "needs_input").length;
  const unread = notifs.filter((n) => !n.read).length;

  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));
  const openRun = (id: string) => {
    setPanel(null);
    navigate(`/runs/${id}`);
  };
  const stopTask = async (id: string) => {
    taskStore.setStatus(id, "failed");
    try {
      await api.stopRun(id);
      notify.success("Task stopped");
    } catch {
      notify.error("Could not stop the task");
    }
  };

  return (
    <>
      {panel === "tasks" && <TasksPanel tasks={tasks} onOpen={openRun} onStop={stopTask} />}
      {panel === "output" && <OutputPanel tasks={tasks} />}
      {panel === "notifications" && <NotificationCenter list={notifs} />}

      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex h-7 items-center justify-end bg-surface-2 text-xs text-muted"
        style={{ borderTop: "1px solid var(--vcc-line)" }}
      >
        <button
          onClick={() => toggle("tasks")}
          className={`${barBtn} ${panel === "tasks" ? "bg-black/10 dark:bg-white/10" : ""}`}
        >
          {running > 0 ? <SyncOutlined spin className="text-accent" /> : <ProfileOutlined />}
          <span>Tasks{running > 0 ? ` (${running})` : ""}</span>
        </button>
        <button
          onClick={() => toggle("output")}
          className={`${barBtn} ${panel === "output" ? "bg-black/10 dark:bg-white/10" : ""}`}
        >
          <CodeOutlined />
          <span>Output</span>
        </button>
        <UsageWidget />
        <button
          onClick={() => {
            toggle("notifications");
            notificationStore.markAllRead();
          }}
          className={`${barBtn} ${panel === "notifications" ? "bg-black/10 dark:bg-white/10" : ""}`}
        >
          <BellOutlined />
          {unread > 0 && (
            <span className="rounded-full bg-accent px-1.5 text-[10px] font-medium text-white">
              {unread}
            </span>
          )}
        </button>
        <ThemeToggle />
      </div>
    </>
  );
}
