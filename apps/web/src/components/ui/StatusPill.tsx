import type { RunStatus, StageStatus } from "@vcc-workflow/schema";
import { Tag } from "./Tag";

const RUN_COLOR: Record<RunStatus, string> = {
  pending: "default",
  running: "processing",
  done: "success",
  failed: "error",
  needs_input: "warning",
};

const STAGE_COLOR: Record<StageStatus, string> = {
  pending: "default",
  running: "processing",
  passed: "success",
  failed: "error",
  skipped: "default",
};

export function RunStatusPill({ status }: { status: string }) {
  const color = RUN_COLOR[status as RunStatus] ?? "default";
  return <Tag color={color}>{status.replace("_", " ")}</Tag>;
}

export function StageStatusPill({ status }: { status: string }) {
  const color = STAGE_COLOR[status as StageStatus] ?? "default";
  return <Tag color={color}>{status}</Tag>;
}
