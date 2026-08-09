import { useEffect, useState } from "react";
import type { LedgerSummary } from "@vcc-workflow/schema";
import { api, type Headroom } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function useTokens() {
  const dispatch = useAppDispatch();
  const currentId = useAppSelector((s) => s.projects.currentId);
  const runs = useAppSelector((s) => s.runs.list);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [headroom, setHeadroom] = useState<Headroom | null>(null);

  useEffect(() => {
    let active = true;
    void api.headroom().then((h) => {
      if (active) setHeadroom(h);
    });
    if (!currentId) {
      setSummary(null);
      return () => {
        active = false;
      };
    }
    void dispatch.runs.load(currentId);
    void api.ledgerProject(currentId).then((s) => {
      if (active) setSummary(s);
    });
    return () => {
      active = false;
    };
  }, [dispatch, currentId]);

  return { hasProject: Boolean(currentId), summary, runs, headroom };
}
