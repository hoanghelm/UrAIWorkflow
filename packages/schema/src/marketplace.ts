import { z } from "zod";

export const marketplaceKindSchema = z.enum([
  "template",
  "agent",
  "skill",
  "command",
  "hook",
  "mcp",
  "plugin",
]);
export type MarketplaceKind = z.infer<typeof marketplaceKindSchema>;

export const marketplaceItemSchema = z.object({
  id: z.string(),
  kind: marketplaceKindSchema,
  name: z.string(),
  description: z.string(),
  author: z.string().default(""),
  tags: z.array(z.string()).default([]),
  stars: z.number().int().nonnegative().default(0),
  source: z.string().default(""),
  install: z.string().default(""),
  bundle: z.array(z.string()).default([]),
  content: z.string().default(""),
});
export type MarketplaceItem = z.infer<typeof marketplaceItemSchema>;

export const installRequestSchema = z.object({
  projectId: z.string().min(1),
  ids: z.array(z.string()).min(1),
});
export type InstallRequest = z.infer<typeof installRequestSchema>;
