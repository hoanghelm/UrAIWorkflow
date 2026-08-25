import type { StageStatus } from "@vcc-workflow/schema";
import { Tag } from "./Tag";

const STATUS_COLOR: Record<string, string> = {
  pending: "default",
  running: "processing",
  done: "success",
  failed: "error",
  needs_input: "warning",
  todo: "default",
  in_process: "processing",
  review: "warning",
  completed: "success",
  closed: "default",
  cancelled: "error",
};

const STAGE_COLOR: Record<StageStatus, string> = {
  pending: "default",
  running: "processing",
  passed: "success",
  failed: "error",
  skipped: "default",
};

export function RunStatusPill({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "default";
  return <Tag color={color}>{status.replace("_", " ")}</Tag>;
}

export function StageStatusPill({ status }: { status: string }) {
  const color = STAGE_COLOR[status as StageStatus] ?? "default";
  return <Tag color={color}>{status}</Tag>;
}
