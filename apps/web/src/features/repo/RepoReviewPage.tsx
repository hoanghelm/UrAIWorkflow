import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useProjectSummariesQuery } from "@/lib/queries";
import { useThemeMode, notify } from "@/components/ui";

const TOKENS = `
.repo{--bg:#ffffff;--side:#f3f3f3;--activity:#14161c;--title:#f3f3f3;--tabbar:#ececec;--tabon:#ffffff;--taboff:#e4e4e2;--status:#2A6DAC;--text:#14161c;--muted:#6a6a6a;--faint:#a5a49e;--line:#e0ddd6;--accent:#E8734A;--accsoft:rgba(232,115,74,.14);--addbg:#eaf5ef;--addfg:#1a6d47;--delbg:#fdeceb;--delfg:#8a3b38;--num:#b5b3ac;--green:#1E8657;--blue:#2A6DAC;--amber:#a76a06;--indigo:#5457d6;font-family:"IBM Plex Sans",system-ui,sans-serif}
.dark .repo{--bg:#1e1e1e;--side:#252526;--activity:#0b0e15;--title:#2d2d2d;--tabbar:#252526;--tabon:#1e1e1e;--taboff:#2d2d2d;--status:#2A6DAC;--text:#d4d4d4;--muted:#8a8f98;--faint:#6e7681;--line:#2d2d2d;--accsoft:rgba(232,115,74,.18);--addbg:#123021;--addfg:#4cb98a;--delbg:#3a1d1d;--delfg:#e0908c;--num:#5a6069;--green:#3fae7f;--blue:#7fb3e0;--amber:#e2b155;--indigo:#8f92f0}
.repo .mono{font-family:"IBM Plex Mono",ui-monospace,"Cascadia Code",monospace}
.repo button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
.repo ::-webkit-scrollbar{width:10px;height:10px}.repo ::-webkit-scrollbar-thumb{background:var(--line);border-radius:5px}
`;

interface DiffLine {
  type: "add" | "del" | "ctx" | "meta";
  text: string;
  oldNo?: number;
  newNo?: number;
}
interface DiffFile {
  file: string;
  lines: DiffLine[];
}

function parseDiff(patch: string): DiffFile[] {
  const files: DiffFile[] = [];
  let cur: DiffFile | null = null;
  let oldNo = 0;
  let newNo = 0;
  for (const raw of patch.split("\n")) {
    if (raw.startsWith("diff --git")) {
      cur = { file: raw.replace(/^diff --git a\/(.*) b\/.*$/, "$1"), lines: [] };
      files.push(cur);
      continue;
    }
    if (!cur) continue;
    if (/^(index |--- |\+\+\+ |new file|deleted file|similarity|rename|old mode|new mode)/.test(raw)) continue;
    if (raw.startsWith("@@")) {
      const m = raw.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) {
        oldNo = Number(m[1]);
        newNo = Number(m[2]);
      }
      cur.lines.push({ type: "meta", text: raw });
      continue;
    }
    if (raw.startsWith("+")) cur.lines.push({ type: "add", text: raw.slice(1), newNo: newNo++ });
    else if (raw.startsWith("-")) cur.lines.push({ type: "del", text: raw.slice(1), oldNo: oldNo++ });
    else cur.lines.push({ type: "ctx", text: raw.slice(1), oldNo: oldNo++, newNo: newNo++ });
  }
  return files;
}

function traceColor(line: string): string {
  if (line.startsWith("context ")) return "var(--indigo)";
  if (line.startsWith("thinking ")) return "var(--muted)";
  if (line.startsWith("call ")) return "var(--accent)";
  return "var(--faint)";
}

const statusMeta = (s: string) =>
  s === "running"
    ? { text: "RUNNING", color: "var(--blue)" }
    : s === "needs_input"
      ? { text: "NEEDS INPUT", color: "var(--amber)" }
      : s === "done"
        ? { text: "DONE", color: "var(--green)" }
        : s === "failed"
          ? { text: "FAILED", color: "var(--delfg)" }
          : { text: s.toUpperCase(), color: "var(--faint)" };

type Tab = "diff" | "plan" | "tests" | "trace";

export function RepoReviewPage() {
  const { runId = "" } = useParams();
  const navigate = useNavigate();
  const { mode, toggle } = useThemeMode();
  const [tab, setTab] = useState<Tab>("diff");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [steer, setSteer] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const [askText, setAskText] = useState("");
  const [working, setWorking] = useState(false);

  const { data: run } = useQuery({ queryKey: ["run", runId], queryFn: () => api.run(runId), enabled: !!runId });
  const { data: projectSummaries = [] } = useProjectSummariesQuery();
  const projectName = run?.projectId ? projectSummaries.find((p) => p.id === run.projectId)?.name : undefined;
  const { data: logs = {} } = useQuery({ queryKey: ["run-logs", runId], queryFn: () => api.runLogs(runId), enabled: !!runId });
  const { data: diff } = useQuery({ queryKey: ["run-diff", runId], queryFn: () => api.runDiff(runId), enabled: !!runId });
  const { data: arts } = useQuery({ queryKey: ["run-arts", runId], queryFn: () => api.runArtifacts(runId), enabled: !!runId });

  const stages = run?.stages ?? [];
  const orderedTrace = useMemo(
    () =>
      stages
        .flatMap((s) => (logs[s.stageId]?.trace ?? "").split("\n"))
        .map((l) => l.trimEnd())
        .filter(Boolean),
    [stages, logs],
  );
  const liveRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = liveRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      el.scrollTop = el.scrollHeight;
    }
  }, [orderedTrace.length]);
  const diffFiles = useMemo(() => (diff?.patch ? parseDiff(diff.patch) : []), [diff]);
  const filesTouched = diff?.files ?? [];
  const artFiles = arts?.artifacts ?? [];
  const contextLine = orderedTrace.find((l) => l.startsWith("context "));
  const cachedTok = run?.tokensCached ?? 0;

  const guardrails = useMemo(() => {
    try {
      return run?.workflow ? JSON.parse(run.workflow).guardrails ?? {} : {};
    } catch {
      return {};
    }
  }, [run]);
  const budgetTok = guardrails?.budget?.tokens as number | undefined;
  const usedTok = run?.tokensConsumed ?? 0;
  const budgetPct = budgetTok ? Math.min(100, Math.round((usedTok / budgetTok) * 100)) : null;

  const planStage = stages.find((s) => s.agent === "planner" || s.stageId.includes("plan"));
  const testStage = stages.find((s) => /test/i.test(s.title) || /test/i.test(s.agent));
  const finalText = stages.length ? logs[stages[stages.length - 1].stageId]?.text : "";

  const stop = async () => {
    await api.stopRun(runId);
    notify.success("Stopping the run");
  };
  const resolveCard = async () => {
    if (!run?.projectId) return null;
    const cards = await api.board(run.projectId);
    return cards.find((c) => c.runId === runId) ?? null;
  };
  const approve = async () => {
    setWorking(true);
    try {
      const card = await resolveCard();
      if (!card) {
        notify.error("This run has no linked task to approve.");
        return;
      }
      await api.addBoardComment(card.id, { body: "Approved from review.", kind: "approve" });
      await api.moveBoardCard(card.id, "completed", 0);
      notify.success("Approved", "Moved to Done.");
      navigate("/board");
    } finally {
      setWorking(false);
    }
  };
  const submitAsk = async () => {
    if (!askText.trim()) {
      return;
    }
    setWorking(true);
    try {
      const card = await resolveCard();
      if (!card) {
        notify.error("This run has no linked task, so there's nothing to send changes to.");
        return;
      }
      await api.addBoardComment(card.id, { body: askText.trim(), kind: "request_changes" });
      setAskOpen(false);
      setAskText("");
      notify.success("Changes requested", "The workflow will re-run with your feedback at the top.");
    } finally {
      setWorking(false);
    }
  };

  const sendSteer = async () => {
    if (!steer.trim()) return;
    await api.resumeRun(runId, steer.trim());
    setSteer("");
    notify.success("Resuming the run with your answer");
  };

  const st = statusMeta(run?.status ?? "");

  return (
    <div className="repo" style={{ height: "100vh", display: "flex", background: "var(--bg)", color: "var(--text)", overflow: "hidden", fontSize: 13 }}>
      <style>{TOKENS}</style>

      {askOpen && (
        <div
          onClick={() => setAskOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 60, display: "grid", placeItems: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 520, maxWidth: "92vw", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div style={{ fontWeight: 600, fontSize: 15 }}>Ask for changes</div>
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
              Describe what should change. The workflow re-runs with your feedback placed at the top of the next run.
            </div>
            <textarea
              autoFocus
              value={askText}
              onChange={(e) => setAskText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && askText.trim() && !working) {
                  e.preventDefault();
                  void submitAsk();
                }
              }}
              rows={5}
              placeholder="Describe the changes…"
              style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", fontSize: 13.5, lineHeight: 1.5, background: "var(--side)", color: "var(--text)", fontFamily: "inherit", resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setAskOpen(false)} style={{ border: "1px solid var(--line)", borderRadius: 7, padding: "8px 14px", fontWeight: 500, background: "var(--bg)", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={submitAsk} disabled={!askText.trim() || working} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 7, padding: "8px 16px", fontWeight: 500, cursor: "pointer", opacity: askText.trim() && !working ? 1 : 0.5 }}>
                {working ? "Sending…" : "Send & re-run"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ width: 48, flex: "none", background: "var(--activity)", display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0", gap: 4, color: "#8b93a3" }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: "var(--accent)", marginBottom: 8 }} />
        {[
          { i: "▦", to: "/board" },
          { i: "◧", on: true },
          { i: "⚙", to: "/runs/" + runId },
        ].map((x, k) => (
          <button key={k} onClick={() => x.to && navigate(x.to)} style={{ width: 40, height: 40, fontSize: 17, color: x.on ? "var(--accent)" : "#8b93a3", borderLeft: x.on ? "2px solid var(--accent)" : "2px solid transparent" }}>
            {x.i}
          </button>
        ))}
        <button onClick={toggle} title="Theme" style={{ marginTop: "auto", width: 40, height: 40, fontSize: 16, color: "#8b93a3" }}>
          {mode === "dark" ? "◑" : "◐"}
        </button>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ height: 40, flex: "none", display: "flex", alignItems: "center", gap: 10, padding: "0 14px", background: "var(--title)", borderBottom: "1px solid var(--line)" }}>
          <span className="mono" style={{ fontWeight: 500, fontSize: 12.5 }}>
            {projectName && (
              <>
                {projectName}
                <span style={{ color: "var(--faint)" }}> / </span>
              </>
            )}
            {run?.name ?? "run"}
          </span>
          <span className="mono" style={{ fontWeight: 500, fontSize: 11, color: st.color, border: `1px solid ${st.color}`, borderRadius: 11, padding: "2px 8px" }}>
            {st.text}
          </span>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {budgetPct !== null && (
              <>
                <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>budget {budgetPct}%</span>
                <span style={{ width: 80, height: 6, borderRadius: 3, background: "var(--line)", overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", width: `${budgetPct}%`, background: "var(--accent)" }} />
                </span>
              </>
            )}
            {run?.status === "running" && (
              <button onClick={stop} style={{ border: "1px solid var(--delfg)", color: "var(--delfg)", borderRadius: 6, padding: "4px 11px", fontWeight: 500, fontSize: 12 }}>
                Stop
              </button>
            )}
          </span>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <aside style={{ width: 244, flex: "none", borderRight: "1px solid var(--line)", background: "var(--side)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div className="mono" style={{ padding: "11px 14px 6px", fontWeight: 600, fontSize: 11, letterSpacing: ".1em", color: "var(--muted)" }}>
              FILES TOUCHED · {Math.max(filesTouched.length, artFiles.length)}
            </div>
            <div style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
              {(filesTouched.length ? filesTouched : artFiles.map((a) => ({ path: a.name, additions: 0, deletions: 0 }))).map((f) => {
                const on = selectedFile === f.path;
                return (
                  <button
                    key={f.path}
                    onClick={() => {
                      setSelectedFile(on ? null : f.path);
                      setTab("diff");
                    }}
                    className="mono"
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 5, fontSize: 12.5, width: "100%", border: "none", cursor: "pointer", textAlign: "left", background: on ? "var(--accsoft)" : "transparent", color: on ? "var(--accent)" : "var(--text)" }}
                  >
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f.path}>
                      {f.path.split("/").pop()}
                    </span>
                    {f.additions > 0 && <span style={{ marginLeft: "auto", color: "var(--green)" }}>+{f.additions}</span>}
                    {f.deletions > 0 && <span style={{ color: "var(--delfg)" }}>−{f.deletions}</span>}
                  </button>
                );
              })}
              {filesTouched.length === 0 && artFiles.length === 0 && (
                <div style={{ padding: "6px 8px", fontSize: 12, color: "var(--faint)" }}>No files recorded.</div>
              )}
            </div>
            <div style={{ marginTop: "auto", borderTop: "1px solid var(--line)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="mono" style={{ fontWeight: 600, fontSize: 11, letterSpacing: ".1em", color: "var(--muted)" }}>IN CONTEXT</div>
              <div className="mono" style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5 }}>
                {contextLine ? contextLine.replace(/^context ·?\s*/, "") : "workspace rules + skills"}
              </div>
              {cachedTok > 0 && (
                <div className="mono" style={{ fontSize: 11, color: "var(--green)" }}>{Math.round(cachedTok / 1000)}k tok served from cache</div>
              )}
            </div>
          </aside>

          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--bg)" }}>
            <div style={{ height: 35, flex: "none", display: "flex", alignItems: "stretch", background: "var(--tabbar)", borderBottom: "1px solid var(--line)", fontSize: 12.5 }}>
              {(["diff", "plan", "tests", "trace"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{ padding: "0 16px", textTransform: "capitalize", background: tab === t ? "var(--tabon)" : "transparent", color: tab === t ? "var(--text)" : "var(--muted)", borderTop: tab === t ? "2px solid var(--accent)" : "2px solid transparent" }}
                >
                  {t}
                  {t === "tests" && testStage && <span className="mono" style={{ marginLeft: 6, fontSize: 10.5, color: "var(--muted)" }}>{testStage.status}</span>}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
              {tab === "diff" &&
                (diffFiles.length ? (
                  <div className="mono" style={{ fontSize: 12.5, lineHeight: 1.7 }}>
                    {diffFiles
                      .filter((f) => !selectedFile || f.file === selectedFile)
                      .map((f) => (
                      <div key={f.file}>
                        <div style={{ padding: "8px 16px", background: "var(--side)", borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>{f.file}</div>
                        {f.lines.map((ln, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              background: ln.type === "add" ? "var(--addbg)" : ln.type === "del" ? "var(--delbg)" : "transparent",
                              color: ln.type === "add" ? "var(--addfg)" : ln.type === "del" ? "var(--delfg)" : ln.type === "meta" ? "var(--faint)" : "var(--text)",
                            }}
                          >
                            <span style={{ width: 44, flex: "none", textAlign: "right", paddingRight: 8, color: "var(--num)", userSelect: "none" }}>{ln.oldNo ?? ""}</span>
                            <span style={{ width: 44, flex: "none", textAlign: "right", paddingRight: 10, color: "var(--num)", userSelect: "none" }}>{ln.newNo ?? ""}</span>
                            <span style={{ flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-word", paddingRight: 12 }}>
                              {ln.type === "add" ? "+" : ln.type === "del" ? "−" : " "}
                              {ln.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty text="This run's working directory isn't a git repo, so there's no line diff. The files it produced are listed on the left." />
                ))}

              {tab === "plan" && <Pre text={planStage ? logs[planStage.stageId]?.text : finalText} empty="No plan output." />}
              {tab === "tests" && <Pre text={testStage ? logs[testStage.stageId]?.trace || logs[testStage.stageId]?.text : ""} empty="No test stage in this run." />}
              {tab === "trace" && (
                <div className="mono" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                  {orderedTrace.map((l, i) => (
                    <div key={i} style={{ borderLeft: `2px solid ${traceColor(l)}`, paddingLeft: 9, color: traceColor(l) }}>{l}</div>
                  ))}
                </div>
              )}
            </div>

            {tab === "diff" && finalText && (
              <div style={{ margin: "12px 16px", border: "1px solid var(--line)", borderLeft: "3px solid var(--accent)", borderRadius: 8, padding: "11px 14px", fontSize: 13, lineHeight: 1.6, background: "var(--side)" }}>
                <b style={{ fontWeight: 600 }}>Why this change:</b> {finalText.replace(/\s+/g, " ").slice(0, 320)}
                {finalText.length > 320 ? "…" : ""}
              </div>
            )}

            <div style={{ flex: "none", borderTop: "1px solid var(--line)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, background: "var(--side)" }}>
              <span className="mono" style={{ fontSize: 12, color: "var(--faint)" }}>review this run · approve to move the task to Done</span>
              <button onClick={() => setAskOpen(true)} style={{ marginLeft: "auto", border: "1px solid var(--line)", borderRadius: 7, padding: "8px 14px", fontWeight: 500, background: "var(--bg)", cursor: "pointer" }}>
                Ask for changes
              </button>
              <button
                onClick={() => {
                  const dir = diff?.cwd;
                  if (!dir) {
                    notify.error("This run has no working directory to open.");
                    return;
                  }
                  const target = (selectedFile ? `${dir}/${selectedFile}` : dir).replace(/\\/g, "/");
                  window.open(`vscode://file/${target}`);
                }}
                style={{ border: "1px solid var(--line)", borderRadius: 7, padding: "8px 14px", fontWeight: 500, background: "var(--bg)" }}
              >
                Open in editor
              </button>
              <button onClick={approve} disabled={working} style={{ background: "var(--green)", color: "#fff", border: "none", borderRadius: 7, padding: "8px 18px", fontWeight: 500, cursor: "pointer", opacity: working ? 0.6 : 1 }}>
                {working ? "Approving…" : "Approve"}
              </button>
            </div>
          </div>

          <aside style={{ width: 336, flex: "none", borderLeft: "1px solid var(--line)", background: "var(--side)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
              <span className="mono" style={{ fontWeight: 600, fontSize: 11, letterSpacing: ".1em", color: "var(--muted)" }}>LIVE AGENT</span>
              <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--faint)" }}>{orderedTrace.filter((l) => l.startsWith("call ")).length} calls</span>
            </div>
            <div ref={liveRef} className="mono" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 7, fontSize: 11.5, lineHeight: 1.55 }}>
              {orderedTrace.map((l, i) => (
                <div key={i} style={{ borderLeft: `2px solid ${traceColor(l)}`, paddingLeft: 9, color: traceColor(l) }}>{l}</div>
              ))}
              {orderedTrace.length === 0 && <div style={{ color: "var(--faint)" }}>No trace captured for this run.</div>}
            </div>
            <div style={{ flex: "none", borderTop: "1px solid var(--line)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ border: "1px solid var(--line)", background: "var(--bg)", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="mono" style={{ fontWeight: 600, fontSize: 11, letterSpacing: ".08em", color: "var(--muted)" }}>GUARDRAILS</div>
                <Guard k="retries" v={`max ${guardrails.maxRetries ?? "—"}`} />
                <Guard k="loop depth" v={`max ${guardrails.maxLoopDepth ?? "—"}`} />
                <Guard k="budget" v={budgetTok ? `${Math.round(usedTok / 1000)}k of ${Math.round(budgetTok / 1000)}k` : `${Math.round(usedTok / 1000)}k`} />
                <Guard k="on breach" v={guardrails.onBreach ?? "pause"} color="var(--green)" />
              </div>
              {run?.status === "needs_input" && (
                <div style={{ border: "1px solid var(--amber)", background: "var(--bg)", borderRadius: 8, padding: "9px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {run?.question && <div style={{ fontSize: 12.5, color: "var(--amber)" }}>{run.question}</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      value={steer}
                      onChange={(e) => setSteer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && steer.trim()) {
                          e.preventDefault();
                          void sendSteer();
                        }
                      }}
                      placeholder="Answer to unblock…"
                      style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 6, padding: "6px 9px", fontSize: 12.5, background: "var(--bg)", color: "var(--text)", fontFamily: "inherit" }}
                    />
                    <button
                      onClick={sendSteer}
                      style={{ background: "var(--activity)", color: "#fff", border: "none", borderRadius: 5, padding: "6px 11px", fontSize: 11.5, fontWeight: 500, cursor: "pointer" }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        <div className="mono" style={{ height: 22, flex: "none", display: "flex", alignItems: "center", gap: 0, background: "var(--status)", color: "#fff", fontSize: 11 }}>
          <span style={{ padding: "0 10px", height: "100%", display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.12)" }}>
            ⎇ {diff?.branch || run?.pack || "run"}
          </span>
          <span style={{ padding: "0 10px" }}>{st.text.toLowerCase()}</span>
          <span style={{ padding: "0 10px" }}>{Math.round(usedTok / 1000)}k tok</span>
          <span style={{ marginLeft: "auto", padding: "0 10px", height: "100%", display: "flex", alignItems: "center" }}>{stages.filter((s) => s.status === "passed").length}/{stages.length} stages</span>
          <button onClick={toggle} style={{ padding: "0 12px", height: "100%", color: "#fff" }}>{mode === "dark" ? "◑ dark" : "◐ light"}</button>
        </div>
      </div>
    </div>
  );
}

function Pre({ text, empty }: { text?: string; empty: string }) {
  if (!text) return <Empty text={empty} />;
  return (
    <pre className="mono" style={{ margin: 0, padding: 16, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12.5, lineHeight: 1.7 }}>
      {text}
    </pre>
  );
}
function Empty({ text }: { text: string }) {
  return <div style={{ padding: 24, color: "var(--faint)", fontSize: 13, maxWidth: 520, lineHeight: 1.6 }}>{text}</div>;
}
function Guard({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)" }}>
      <span>{k}</span>
      <span style={{ color: color ?? "var(--text)" }}>{v}</span>
    </div>
  );
}
