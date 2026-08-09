import { z } from "zod";
import { guardrailsSchema } from "./guardrails";

export const modelTierSchema = z.enum(["opus", "sonnet", "haiku", "inherit"]);
export type ModelTier = z.infer<typeof modelTierSchema>;

export const leverSchema = z.enum([
  "codegraph",
  "rtk",
  "ponytail",
  "caveman",
  "routing",
  "disclosure",
]);
export type Lever = z.infer<typeof leverSchema>;

export const trustTierSchema = z.enum(["verified", "community"]);
export type TrustTier = z.infer<typeof trustTierSchema>;

export const stageSchema = z.object({
  id: z.string().min(1),
  title: z.string().default(""),
  action: z.string().default("ai-task"),
  description: z.string().default(""),
  instruction: z.string().default(""),
  agent: z.string().min(1),
  model: modelTierSchema.default("inherit"),
  skills: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  verify: z.string().optional(),
  gate: z.string().optional(),
});
export type Stage = z.infer<typeof stageSchema>;

export const roleSchema = z.string();
export type Role = z.infer<typeof roleSchema>;

export const packManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().default("0.1.0"),
  title: z.string().default(""),
  description: z.string().default(""),
  roles: z.array(roleSchema).default([]),
  tags: z.array(z.string()).default([]),
  triggers: z.array(z.string()).default([]),
  agents: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  stages: z.array(stageSchema).default([]),
  levers: z.array(leverSchema).default([]),
  guardrails: guardrailsSchema.default({}),
  trust: trustTierSchema.default("community"),
});
export type PackManifest = z.infer<typeof packManifestSchema>;
