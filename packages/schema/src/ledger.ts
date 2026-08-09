import { z } from "zod";

export const ledgerEntrySchema = z.object({
  runId: z.string(),
  stageId: z.string(),
  lever: z.string(),
  tokensBefore: z.number().int().nonnegative(),
  tokensAfter: z.number().int().nonnegative(),
  saved: z.number().int(),
});
export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;

export const ledgerSummarySchema = z.object({
  runId: z.string().optional(),
  projectId: z.string().optional(),
  tokensConsumed: z.number().int().nonnegative(),
  tokensSaved: z.number().int().nonnegative(),
  tokensInput: z.number().int().nonnegative().default(0),
  tokensOutput: z.number().int().nonnegative().default(0),
  tokensCached: z.number().int().nonnegative().default(0),
  byLever: z.record(z.string(), z.number().int()),
});
export type LedgerSummary = z.infer<typeof ledgerSummarySchema>;
