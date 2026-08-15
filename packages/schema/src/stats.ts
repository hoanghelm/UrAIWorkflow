import { z } from "zod";

export const usageStatSchema = z.object({
  blockKind: z.enum(["agent", "skill", "mcp", "tool"]),
  blockName: z.string(),
  invocations: z.number().int().nonnegative(),
  lastUsedAt: z.string(),
});
export type UsageStat = z.infer<typeof usageStatSchema>;
