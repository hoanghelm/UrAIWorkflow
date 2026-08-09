import { z } from "zod";

export const triggerTypeSchema = z.enum(["manual", "schedule"]);
export type TriggerType = z.infer<typeof triggerTypeSchema>;

export const createTriggerInputSchema = z.object({
  name: z.string().min(1),
  projectId: z.string().min(1),
  pack: z.string().min(1),
  type: triggerTypeSchema.default("manual"),
  intervalSec: z.number().int().positive().default(3600),
  enabled: z.boolean().default(true),
});
export type CreateTriggerInput = z.infer<typeof createTriggerInputSchema>;

export const triggerSchema = z.object({
  id: z.string(),
  name: z.string(),
  projectId: z.string(),
  pack: z.string(),
  type: triggerTypeSchema,
  intervalSec: z.number().int(),
  enabled: z.boolean(),
  lastRunAt: z.string().nullable(),
});
export type Trigger = z.infer<typeof triggerSchema>;
