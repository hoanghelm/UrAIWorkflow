import { z } from "zod";

export const budgetSchema = z.object({
  tokens: z.number().int().positive().optional(),
  usd: z.number().positive().optional(),
});
export type Budget = z.infer<typeof budgetSchema>;

export const onBreachSchema = z.enum(["pause", "stop", "fallback"]);
export type OnBreach = z.infer<typeof onBreachSchema>;

export const qualityThresholdSchema = z.enum(["verifier-must-pass", "advisory"]);
export type QualityThreshold = z.infer<typeof qualityThresholdSchema>;

export const guardrailsSchema = z.object({
  maxRetries: z.number().int().min(0).default(3),
  maxLoopDepth: z.number().int().min(1).default(8),
  budget: budgetSchema.default({}),
  stageTimeoutMs: z.number().int().positive().default(600000),
  qualityThreshold: qualityThresholdSchema.default("verifier-must-pass"),
  onBreach: onBreachSchema.default("pause"),
  fallbackModel: z.string().optional(),
  requireHumanGate: z.array(z.string()).default([]),
  allowedTools: z.array(z.string()).default([]),
  backgroundSpend: z.boolean().default(false),
});
export type Guardrails = z.infer<typeof guardrailsSchema>;

export const defaultGuardrails = (): Guardrails => guardrailsSchema.parse({});
