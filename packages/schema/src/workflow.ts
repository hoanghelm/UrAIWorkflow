import { z } from "zod";
import { stageSchema, leverSchema } from "./pack";
import { guardrailsSchema } from "./guardrails";

export const routingProfileSchema = z.object({
  plan: z.string().default("opus"),
  exec: z.string().default("sonnet"),
});
export type RoutingProfile = z.infer<typeof routingProfileSchema>;

export const workflowSchema = z.object({
  name: z.string().min(1),
  pack: z.string().min(1),
  inputs: z.record(z.unknown()).default({}),
  stages: z.array(stageSchema).min(1),
  levers: z.array(leverSchema).default([]),
  routing: routingProfileSchema.default({}),
  guardrails: guardrailsSchema.default({}),
  mcpServers: z.record(z.unknown()).optional(),
});
export type Workflow = z.infer<typeof workflowSchema>;

export const createRunInputSchema = z.object({
  projectId: z.string().min(1),
  cardId: z.string().optional(),
  cwd: z.string().optional(),
  workflow: workflowSchema,
});
export type CreateRunInput = z.infer<typeof createRunInputSchema>;

export const resumeRunInputSchema = z.object({
  answer: z.string().min(1),
});
export type ResumeRunInput = z.infer<typeof resumeRunInputSchema>;

export const generateWorkflowInputSchema = z.object({
  requirement: z.string().min(1),
  context: z.string().default(""),
  streamId: z.string().optional(),
});
export type GenerateWorkflowInput = z.infer<typeof generateWorkflowInputSchema>;
