import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Card,
  Input,
  Modal,
  RunStatusPill,
  LoadingOutlined,
  MessageOutlined,
  StopOutlined,
  ReloadOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  notify,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useRunDetail } from "./useRunDetail";
import { PipelineView } from "./PipelineView";
import { BudgetBar } from "./BudgetBar";

const STAGE_STATE: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "#9aa3b2" },
  running: { label: "Running", color: "#2a6dac" },
  passed: { label: "Passed", color: "#1e8657" },
  failed: { label: "Failed", color: "#bb3b37" },
  skipped: { label: "Skipped", color: "#9aa3b2" },
};

export function RunDetailPage() {
  const { id = "" } = useParams();
  const { run, events, deltas, logs, traces, resume, stop, rerun } = useRunDetail(id);
  const [answer, setAnswer] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [showTrace, setShowTrace] = useState(true);

  const { data: runArts } = useQuery({
    queryKey: ["run-artifacts", id, run?.status],
    queryFn: () => api.runArtifacts(id),
    enabled: Boolean(run),
  });
  const cardId = runArts?.cardId ?? null;

  const { data: prev, refetch: refetchPreview } = useQuery({
    queryKey: ["preview", cardId],
    queryFn: () => api.previewStatus(cardId as string),
    enabled: Boolean(cardId),
    refetchInterval: (q) => (q.state.data?.status === "building" ? 1500 : false),
  });

  const stages = run?.stages ?? [];
  const runningStageId =
    stages.find((s) => s.status === "running")?.stageId ??
    (prev?.status === "building"
      ? "__build__"
      : prev?.status === "ready"
        ? "__deploy__"
        : undefined);

  useEffect(() => {
    if (runningStageId) {
      setSelected(runningStageId);
    }
  }, [runningStageId]);

  const artifacts = runArts?.artifacts ?? [];
  const buildRun = async () => {
    if (!cardId) {
      return;
    }
    try {
      await api.previewStart(cardId, runArts?.artifactId ?? undefined);
      void refetchPreview();
    } catch {
      notify.error("This run didn't produce a runnable web app.");
    }
  };
  const stopPreview = async () => {
    if (!cardId) {
      return;
    }
    await api.previewStop(cardId);
    void refetchPreview();
  };

  const onResume = async () => {
    await resume(answer);
    setAnswer("");
    setAskOpen(false);
  };

  const pstatus = prev?.status ?? "idle";
  const hasDeploy = run?.status === "done" && Boolean(cardId) && artifacts.length > 0;
  const mkStage = (sid: string, title: string, status: string) => ({
    id: sid,
    stageId: sid,
    title,
    agent: "preview",
    model: "",
    status,
    attempts: 0,
    order: 0,
  });
  const buildStageStatus =
    pstatus === "building"
      ? "running"
      : pstatus === "ready" || pstatus === "stopped"
        ? "passed"
        : pstatus === "failed" || pstatus === "error"
          ? "failed"
          : "pending";
  const deployStageStatus =
    pstatus === "ready" ? "running" : pstatus === "stopped" ? "skipped" : "pending";
  const pipelineStages = hasDeploy
    ? [
        ...stages,
        mkStage("__build__", "Build", buildStageStatus),
        mkStage("__deploy__", "Deploy", deployStageStatus),
      ]
    : stages;

  const shownStage =
    pipelineStages.find((s) => s.stageId === selected) ??
    pipelineStages.find((s) => s.status === "running") ??
    pipelineStages[pipelineStages.length - 1];
  const isBuild = shownStage?.stageId === "__build__";
  const isDeploy = shownStage?.stageId === "__deploy__";
  const isSynthetic = isBuild || isDeploy;
  const output = shownStage && !isSynthetic ? deltas[shownStage.stageId] || logs[shownStage.stageId] : "";

  const traceRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLPreElement>(null);
  const tail = (el: HTMLElement | null) => {
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      el.scrollTop = el.scrollHeight;
    }
  };
  const trace = shownStage && !isSynthetic ? traces[shownStage.stageId] : "";
  const traceLines = trace ? trace.split("\n").filter((l) => l.trim()) : [];
  const stageEvents =
    shownStage && !isSynthetic ? events.filter((e) => e.stageId === shownStage.stageId) : [];

  useEffect(() => tail(outputRef.current), [output]);
  useEffect(() => tail(traceRef.current), [traceLines.length, showTrace]);
  const st = shownStage ? STAGE_STATE[shownStage.status] ?? STAGE_STATE.pending : STAGE_STATE.pending;

  if (!run) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card
        title={
          <div className="flex items-center gap-3">
            <span>{run.name}</span>
            <RunStatusPill status={run.status} />
          </div>
        }
        extra={
          <div className="flex gap-2">
            {run.status === "needs_input" && (
              <Button type="primary" icon={<MessageOutlined />} onClick={() => setAskOpen(true)}>
                Answer
              </Button>
            )}
            {run.status === "running" && (
              <Button danger icon={<StopOutlined />} onClick={() => stop()}>
                Stop
              </Button>
            )}
          </div>
        }
      >
        {run.question && (
          <div className="mb-3 rounded bg-amber-50 px-3 py-2 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {run.question}
          </div>
        )}
        <PipelineView
          stages={pipelineStages}
          selectedId={shownStage?.stageId}
          onSelect={(sid) => setSelected(sid)}
          action={(sid) => {
            if (sid === "__build__") {
              return pstatus === "building" ? (
                <LoadingOutlined spin className="text-accent" />
              ) : (
                <button
                  onClick={buildRun}
                  title={buildStageStatus === "passed" ? "Rebuild" : "Run build"}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-white"
                  style={{ background: "#E8734A" }}
                >
                  <PlayCircleOutlined />
                </button>
              );
            }
            if (sid === "__deploy__" && pstatus === "ready") {
              return (
                <button
                  onClick={stopPreview}
                  title="Stop deploy"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white"
                >
                  <StopOutlined />
                </button>
              );
            }
            return null;
          }}
        />
        <div className="mt-3">
          <BudgetBar run={run} />
        </div>
      </Card>

      {shownStage && (
        <Card
          title={
            <div className="flex items-center gap-2">
              {shownStage.status === "running" && <LoadingOutlined spin style={{ color: st.color }} />}
              <span>{shownStage.title || shownStage.stageId}</span>
              <span className="text-xs font-normal" style={{ color: st.color }}>
                {st.label}
              </span>
              {!isSynthetic && (
                <span className="font-mono text-xs font-normal text-faint">
                  {shownStage.agent} · {shownStage.model}
                  {shownStage.attempts > 1 ? ` · attempt ${shownStage.attempts}` : ""}
                </span>
              )}
            </div>
          }
          extra={
            isBuild ? (
              pstatus === "building" ? (
                <span className="flex items-center gap-1 text-xs text-accent">
                  <LoadingOutlined spin /> building
                </span>
              ) : null
            ) : isDeploy ? (
              prev?.url && (
                <Button
                  size="small"
                  type="primary"
                  icon={<LinkOutlined />}
                  style={{ background: "#E8734A" }}
                  onClick={() => window.open(prev.url as string, "_blank")}
                >
                  Open in browser
                </Button>
              )
            ) : (
              run.status !== "running" && (
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => rerun(shownStage.stageId)}
                >
                  Rerun from here
                </Button>
              )
            )
          }
        >
          {isSynthetic && (
            <div className="flex flex-col gap-2">
              <div className="text-sm text-faint">
                {isBuild
                  ? "Installs dependencies and builds the app. Run it, then Deploy serves it."
                  : pstatus === "ready" && prev?.url
                    ? "Serving the built app. Open it in the browser, or stop it here."
                    : "Serves the built app. Run the Build stage first."}
              </div>
              {isDeploy && pstatus === "ready" && prev?.url && (
                <div className="text-xs">
                  Serving at{" "}
                  <a href={prev.url} target="_blank" rel="noreferrer" className="text-accent">
                    {prev.url}
                  </a>
                </div>
              )}
              {prev?.logs && prev.logs.length > 0 && (
                <pre
                  className="max-h-72 overflow-auto rounded-md border p-3 font-mono text-[11px] leading-relaxed"
                  style={{ background: "#14161c", color: "#c9d1d9", borderColor: "#262a33" }}
                >
                  {prev.logs.join("\n")}
                </pre>
              )}
            </div>
          )}
          {!isSynthetic &&
            (output ? (
              <pre
                ref={outputRef}
                className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-md bg-surface-2 p-3 font-mono text-xs text-fg"
              >
                {output}
              </pre>
            ) : (
              <div className="text-sm text-faint">
                {shownStage.status === "pending"
                  ? "Waiting to start."
                  : shownStage.status === "running"
                    ? "Working. Output streams in here as it runs."
                    : "No output for this step."}
              </div>
            ))}
          {traceLines.length > 0 && (
            <div className="mt-3 border-t border-line pt-2">
              <button
                onClick={() => setShowTrace((v) => !v)}
                className="mb-1 text-xs font-semibold uppercase text-faint hover:text-fg"
              >
                {showTrace ? "▾" : "▸"} AI activity ({traceLines.length})
              </button>
              {showTrace && (
                <div ref={traceRef} className="max-h-72 overflow-auto rounded-md bg-surface-2 p-2 font-mono text-xs">
                  {(() => {
                    const lastResult = traceLines.reduce(
                      (idx, l, i) => (l.trimStart().startsWith("result · ") ? i : idx),
                      -1,
                    );
                    return traceLines.map((line, i) => {
                      const isCall = line.startsWith("call · ");
                      const isResult = line.trimStart().startsWith("result · ");
                      const isThinking = line.startsWith("thinking · ");
                      const isContext = line.startsWith("context · ");
                      const pending =
                        isCall && shownStage.status === "running" && i > lastResult;
                      return (
                        <div
                          key={i}
                          className={`flex items-start gap-1.5 whitespace-pre-wrap ${
                            isContext
                              ? "font-semibold text-indigo-400"
                              : isCall
                                ? "text-accent"
                                : isResult
                                  ? "pl-3 text-faint"
                                  : isThinking
                                    ? "text-muted italic"
                                    : "text-fg"
                          }`}
                        >
                          {pending && <LoadingOutlined spin className="mt-0.5 shrink-0" />}
                          <span className={pending ? "" : "flex-1"}>{line}</span>
                          {pending && <span className="text-faint">running</span>}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          )}

          {stageEvents.length > 0 && (
            <div className="mt-3 max-h-40 overflow-auto border-t border-line pt-2 font-mono text-xs">
              {stageEvents.map((e, i) => (
                <div key={i} className="flex gap-3 py-0.5">
                  <span className="text-faint">{new Date(e.at).toLocaleTimeString()}</span>
                  <span
                    className={
                      e.level === "error"
                        ? "text-red-500"
                        : e.level === "warn"
                          ? "text-amber-500"
                          : "text-fg"
                    }
                  >
                    {e.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Modal
        title="Answer the question"
        open={askOpen}
        onOk={onResume}
        onCancel={() => setAskOpen(false)}
        okText="Resume"
      >
        <Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer" />
      </Modal>
    </div>
  );
}
