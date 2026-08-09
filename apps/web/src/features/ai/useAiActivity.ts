import { useEffect, useRef, useState } from "react";
import { onRunDelta } from "@/lib/ws";

export interface AiActivity {
  id: string;
  label: string;
  text: string;
}

export function useAiActivity() {
  const [activity, setActivity] = useState<AiActivity | null>(null);
  const idRef = useRef<string | null>(null);

  useEffect(() => {
    const off = onRunDelta((delta) => {
      if (delta.runId === idRef.current) {
        setActivity((prev) => (prev ? { ...prev, text: prev.text + delta.text } : prev));
      }
    });
    return off;
  }, []);

  const start = (label: string) => {
    const id = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    idRef.current = id;
    setActivity({ id, label, text: "" });
    return id;
  };

  const stop = () => {
    idRef.current = null;
    setActivity(null);
  };

  return { activity, start, stop };
}
