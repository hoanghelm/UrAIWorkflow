import { z } from "zod";

export const aiGenerateInputSchema = z.object({
  kind: z.string().min(1),
  requirement: z.string().min(1),
  context: z.string().default(""),
  persona: z.string().optional(),
  streamId: z.string().optional(),
});
export type AiGenerateInput = z.infer<typeof aiGenerateInputSchema>;

export const personaPackSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().default(""),
  domains: z.array(z.string()).default([]),
  starters: z.array(z.string()).default([]),
});
export type PersonaPack = z.infer<typeof personaPackSchema>;

export const aiGenerateResultSchema = z.object({
  kind: z.string(),
  artifact: z.unknown(),
  summary: z.string(),
});
export type AiGenerateResult = z.infer<typeof aiGenerateResultSchema>;

export const planStepSchema = z.object({
  title: z.string().min(1),
  detail: z.string().default(""),
});
export type PlanStep = z.infer<typeof planStepSchema>;
