import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DownOutlined, RobotOutlined, ThunderboltOutlined } from "@/components/ui";
import { api } from "@/lib/api";

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">{label}</div>
      {children}
    </div>
  );
}

export function TestWorkflowPanel({
  kind,
  color,
  defaultOpen = false,
}: {
  kind: string;
  color: string;
  defaultOpen?: boolean;
}) {
  const { data: workflows = [] } = useQuery({
    queryKey: ["test-workflows"],
    queryFn: () => api.testWorkflows(),
    staleTime: Infinity,
  });
  const [open, setOpen] = useState(defaultOpen);
  const wf = useMemo(() => workflows.find((w) => w.kind === kind), [workflows, kind]);

  if (!wf) return null;

  return (
    <div className="rounded-lg border border-line bg-surface">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 py-2 text-left">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <span className="text-sm font-semibold text-fg">{wf.label} workflow</span>
        <span className="text-xs text-faint">{wf.steps.length} steps</span>
        <DownOutlined className={`ml-auto text-[10px] text-faint transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-line px-3 py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-2 py-0.5">
              <RobotOutlined className="text-accent" /> {wf.agentTitle}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-2 py-0.5">
              <ThunderboltOutlined className="text-accent" /> {wf.model}
            </span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5">{wf.format}</span>
          </div>

          <Section label="Logic">
            <ol className="flex flex-col gap-1.5">
              {wf.steps.map((s, i) => (
                <li key={s.name} className="flex gap-2 text-sm">
                  <span
                    className="flex h-4 w-4 flex-none items-center justify-center rounded-full text-[10px] text-white"
                    style={{ background: color }}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="font-medium text-fg">{s.name}</span>{" "}
                    <span className="text-muted">— {s.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Section>

          {wf.skills.length > 0 && (
            <Section label="Skills">
              <div className="flex flex-wrap gap-1.5">
                {wf.skills.map((sk) => (
                  <span key={sk.name} className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
                    {sk.title}
                  </span>
                ))}
              </div>
            </Section>
          )}

          <Section label="Rules">
            <ul className="flex flex-col gap-1">
              {wf.rules.map((r, i) => (
                <li key={i} className="flex gap-1.5 text-xs text-muted">
                  <span style={{ color }}>•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Section>

          {wf.commands.length > 0 && (
            <Section label="Commands">
              <div className="flex flex-wrap gap-1.5">
                {wf.commands.map((c) => (
                  <span key={c} className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs text-muted">
                    {c}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
