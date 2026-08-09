import { z } from "zod";
import { trustTierSchema } from "./pack";

export const resourceKindSchema = z.enum([
  "agent",
  "skill",
  "command",
  "rule",
  "mcp",
  "plugin",
  "tool",
  "pack",
]);
export type ResourceKind = z.infer<typeof resourceKindSchema>;

export const resourceScopeSchema = z.enum(["project", "workspace", "template", "user"]);
export type ResourceScope = z.infer<typeof resourceScopeSchema>;

export const catalogItemSchema = z.object({
  id: z.string(),
  kind: resourceKindSchema,
  name: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  scope: resourceScopeSchema,
  builtin: z.boolean().optional(),
  path: z.string().optional(),
  projectId: z.string().optional(),
  trust: trustTierSchema.default("community"),
  meta: z.record(z.unknown()).default({}),
});
export type CatalogItem = z.infer<typeof catalogItemSchema>;

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  root: z.string(),
  persona: z.string().default("generalist"),
});
export type Project = z.infer<typeof projectSchema>;

export const explainCodeMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});
export type ExplainCodeMessage = z.infer<typeof explainCodeMessageSchema>;

export const explainCodeInputSchema = z.object({
  streamId: z.string().optional(),
  question: z.string().min(1),
  focus: z.string().optional(),
  files: z.array(z.string()).default([]),
  outline: z.array(z.string()).default([]),
  history: z.array(explainCodeMessageSchema).default([]),
});
export type ExplainCodeInput = z.infer<typeof explainCodeInputSchema>;
