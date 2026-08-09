import type { RunRow } from "@/lib/api";

function readBudget(run: RunRow): number {
  try {
    const parsed = JSON.parse(run.workflow ?? "{}") as {
      guardrails?: { budget?: { tokens?: number } };
    };
    return parsed.guardrails?.budget?.tokens ?? 0;
  } catch {
    return 0;
  }
}

export function BudgetBar({ run }: { run: RunRow }) {
  const cap = readBudget(run);
  if (!cap) {
    return null;
  }
  const used = run.tokensConsumed;
  const pct = Math.min(100, Math.round((used / cap) * 100));
  const danger = pct >= 90;

  return (
    <div>
      <div className="flex justify-between text-xs text-muted">
        <span>Token budget</span>
        <span>
          {used.toLocaleString()} / {cap.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="mt-1 h-2 rounded bg-gray-100 dark:bg-gray-700">
        <div
          className="h-2 rounded"
          style={{ width: `${pct}%`, background: danger ? "#bb3b37" : "#E8734A" }}
        />
      </div>
    </div>
  );
}
