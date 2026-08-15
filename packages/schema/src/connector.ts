import { z } from "zod";

export const providerSchema = z.enum(["claude", "claude-agent", "copilot"]);
export type Provider = z.infer<typeof providerSchema>;

export const modelMapSchema = z.object({
  opus: z.string(),
  sonnet: z.string(),
  haiku: z.string(),
});
export type ModelMap = z.infer<typeof modelMapSchema>;

export const connectorSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: providerSchema,
  baseUrl: z.string().optional(),
  models: modelMapSchema,
  active: z.boolean().default(false),
  hasKey: z.boolean().default(false),
});
export type Connector = z.infer<typeof connectorSchema>;

export const createConnectorInputSchema = z
  .object({
    name: z.string().min(1),
    provider: providerSchema.default("claude"),
    apiKey: z.string().default(""),
    baseUrl: z.string().optional(),
    models: modelMapSchema.partial().optional(),
  })
  .refine(
    (v) => v.provider === "claude-agent" || v.provider === "copilot" || v.apiKey.length > 0,
    {
      message: "apiKey is required for the claude provider",
      path: ["apiKey"],
    },
  );
export type CreateConnectorInput = z.infer<typeof createConnectorInputSchema>;

export const modelUsageSchema = z.object({
  model: z.string(),
  tokens: z.number(),
});
export type ModelUsage = z.infer<typeof modelUsageSchema>;

export const connectorUsageSchema = z.object({
  account: z
    .object({ id: z.string(), name: z.string(), provider: providerSchema })
    .nullable(),
  models: modelMapSchema.nullable(),
  byModel: z.array(modelUsageSchema),
  totalConsumed: z.number(),
  totalSaved: z.number(),
  byLever: z.record(z.string(), z.number().int()).default({}),
});
export type ConnectorUsage = z.infer<typeof connectorUsageSchema>;

export const defaultClaudeModels = (): ModelMap => ({
  opus: "claude-opus-4-8",
  sonnet: "claude-sonnet-5",
  haiku: "claude-haiku-4-5-20251001",
});

export const defaultCopilotModels = (): ModelMap => ({
  opus: "gpt-4o",
  sonnet: "gpt-4o",
  haiku: "gpt-4o-mini",
});
