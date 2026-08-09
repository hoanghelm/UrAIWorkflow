import { useEffect, useState } from "react";
import { onReconnect, onRunDelta, onRunEvent, onRunTrace } from "@/lib/ws";
import { notify } from "@/components/ui";
import { api } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function useRunDetail(id: string) {
  const dispatch = useAppDispatch();
  const run = useAppSelector((s) => s.runs.current);
  const events = useAppSelector((s) => s.runs.events);
  const [deltas, setDeltas] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<Record<string, string>>({});
  const [traces, setTraces] = useState<Record<string, string>>({});

  const loadLogs = (): void => {
    void api.runLogs(id).then((rows) => {
      const text: Record<string, string> = {};
      const trace: Record<string, string> = {};
      for (const [stageId, entry] of Object.entries(rows)) {
        text[stageId] = entry.text;
        if (entry.trace) {
          trace[stageId] = entry.trace;
        }
      }
      setLogs(text);
      setTraces((prev) => ({ ...trace, ...prev }));
    });
  };

  useEffect(() => {
    setDeltas({});
    setLogs({});
    setTraces({});
    void dispatch.runs.open(id);
    loadLogs();
  }, [dispatch, id]);

  useEffect(() => {
    const off = onRunEvent((event) => {
      if (event.runId !== id) {
        return;
      }
      dispatch.runs.appendEvent(event);
      if (event.stageId && event.stageStatus) {
        dispatch.runs.patchStage({ stageId: event.stageId, status: event.stageStatus });
      }
      if (event.stageStatus === "passed" || event.status === "done" || event.status === "failed") {
        loadLogs();
      }
      if (event.status === "done" || event.status === "failed" || event.status === "needs_input") {
        void dispatch.runs.refresh(id);
      }
    });
    return off;
  }, [dispatch, id]);

  useEffect(() => {
    const off = onRunDelta((delta) => {
      if (delta.runId !== id) {
        return;
      }
      setDeltas((prev) => ({ ...prev, [delta.stageId]: (prev[delta.stageId] ?? "") + delta.text }));
    });
    return off;
  }, [id]);

  useEffect(() => {
    const off = onRunTrace((t) => {
      if (t.runId !== id) {
        return;
      }
      setTraces((prev) => ({ ...prev, [t.stageId]: (prev[t.stageId] ?? "") + t.text }));
    });
    return off;
  }, [id]);

  useEffect(() => {
    const off = onReconnect(() => {
      void dispatch.runs.refresh(id);
      loadLogs();
    });
    return off;
  }, [dispatch, id]);

  const resume = async (answer: string) => {
    await dispatch.runs.resume({ id, answer });
    notify.success("Resumed");
  };

  const stop = () => dispatch.runs.stop(id);
  const rerun = async (stageId: string) => {
    setDeltas({});
    setTraces({});
    await dispatch.runs.rerunStage({ id, stageId });
    notify.success("Re-running from this stage");
    loadLogs();
  };

  return { run, events, deltas, logs, traces, resume, stop, rerun };
}
