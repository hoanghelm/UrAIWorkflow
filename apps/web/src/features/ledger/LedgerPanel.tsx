import { Card, Statistic } from "@/components/ui";
import { useLedger } from "./useLedger";

export function LedgerPanel({ runId, refreshKey }: { runId: string; refreshKey: unknown }) {
  const summary = useLedger(runId, refreshKey);

  if (!summary) {
    return null;
  }

  return (
    <Card title="Token Savings Ledger">
      <div className="flex gap-8">
        <Statistic title="Consumed" value={summary.tokensConsumed} />
        <Statistic title="Saved" value={summary.tokensSaved} valueStyle={{ color: "#1E8657" }} />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {Object.entries(summary.byLever).map(([lever, saved]) => (
          <div key={lever} className="rounded border border-gray-200 px-3 py-2 dark:border-gray-700">
            <div className="text-xs uppercase text-faint">{lever}</div>
            <div className="font-mono">{Number(saved).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
