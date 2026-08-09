import { useEffect, useRef } from "react";
import { Spin, BulbOutlined, CloseOutlined } from "@/components/ui";
import type { AiActivity } from "./useAiActivity";

export function AiActivityPanel({
  activity,
  onClose,
}: {
  activity: AiActivity | null;
  onClose: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [activity?.text]);

  if (!activity) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <BulbOutlined className="text-accent" />
        <span className="text-sm font-medium text-fg">{activity.label}</span>
        <Spin size="small" className="ml-1" />
        <button onClick={onClose} className="ml-auto text-faint hover:text-fg">
          <CloseOutlined />
        </button>
      </div>
      <div
        ref={bodyRef}
        className="max-h-64 overflow-auto whitespace-pre-wrap px-3 py-2 font-mono text-xs leading-relaxed text-muted"
      >
        {activity.text || "Contacting the model…"}
      </div>
    </div>
  );
}
