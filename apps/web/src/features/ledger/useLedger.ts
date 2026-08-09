import { useEffect, useState } from "react";
import type { LedgerSummary } from "@vcc-workflow/schema";
import { api } from "@/lib/api";

export function useLedger(runId: string, refreshKey: unknown) {
  const [summary, setSummary] = useState<LedgerSummary | null>(null);

  useEffect(() => {
    let active = true;
    void api.ledgerRun(runId).then((s) => {
      if (active) {
        setSummary(s);
      }
    });
    return () => {
      active = false;
    };
  }, [runId, refreshKey]);

  return summary;
}
