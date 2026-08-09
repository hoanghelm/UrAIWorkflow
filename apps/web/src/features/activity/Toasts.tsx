import { useState } from "react";
import { CloseOutlined, DownOutlined } from "@/components/ui";
import { notificationStore, type AppNotification } from "@/lib/activity/notifications";
import { useNotifications } from "@/lib/activity/hooks";
import { LEVEL_META } from "./levelMeta";

function ToastRow({ n }: { n: AppNotification }) {
  const [open, setOpen] = useState(false);
  const meta = LEVEL_META[n.level];
  return (
    <div className="pointer-events-auto w-80 overflow-hidden rounded-lg border border-line bg-surface shadow-2xl">
      <div className="flex items-start gap-2 p-3">
        <span className={`mt-0.5 ${meta.color}`}>{meta.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <span className="flex-1 break-words text-sm font-medium text-fg">{n.title}</span>
            {n.description && (
              <button onClick={() => setOpen((o) => !o)} className="mt-0.5 text-faint hover:text-fg">
                <DownOutlined className={`text-[10px] transition-transform ${open ? "" : "-rotate-90"}`} />
              </button>
            )}
          </div>
          {n.description && open && (
            <p className="mt-1 whitespace-pre-wrap break-words text-xs text-muted">{n.description}</p>
          )}
        </div>
        <button
          onClick={() => notificationStore.dismissToast(n.id)}
          className="text-faint hover:text-fg"
          aria-label="Dismiss"
        >
          <CloseOutlined />
        </button>
      </div>
    </div>
  );
}

export function Toasts() {
  const list = useNotifications();
  const toasts = list.filter((n) => n.toast).slice(0, 4);
  if (toasts.length === 0) {
    return null;
  }
  return (
    <div className="pointer-events-none fixed bottom-9 right-3 z-[60] flex flex-col gap-2">
      {toasts.map((n) => (
        <ToastRow key={n.id} n={n} />
      ))}
    </div>
  );
}
