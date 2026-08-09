import { z } from "zod";

export const runStatusSchema = z.enum([
  "pending",
  "running",
  "done",
  "failed",
  "needs_input",
]);
export type RunStatus = z.infer<typeof runStatusSchema>;

export const stageStatusSchema = z.enum([
  "pending",
  "running",
  "passed",
  "failed",
  "skipped",
]);
export type StageStatus = z.infer<typeof stageStatusSchema>;

export const breachReasonSchema = z.enum([
  "retry_exhausted",
  "budget_hit",
  "timeout",
  "quality_fail",
  "user_stop",
]);
export type BreachReason = z.infer<typeof breachReasonSchema>;

export const runEventSchema = z.object({
  runId: z.string(),
  at: z.string(),
  level: z.enum(["info", "warn", "error"]).default("info"),
  stageId: z.string().optional(),
  status: runStatusSchema.optional(),
  stageStatus: stageStatusSchema.optional(),
  breach: breachReasonSchema.optional(),
  message: z.string(),
});
export type RunEvent = z.infer<typeof runEventSchema>;
