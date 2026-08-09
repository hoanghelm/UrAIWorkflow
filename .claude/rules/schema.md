# Schema rules (packages/schema)

- Every shared shape is a zod schema plus its inferred type: `export const xSchema = z.object({...}); export type X = z.infer<typeof xSchema>;`.
- Defaults belong in the schema so parsing yields complete objects.
- Group by domain: `guardrails`, `pack`, `workflow`, `run`, `ledger`, `catalog`. Re-export from `src/index.ts`.
- Only dependency is zod. Must import cleanly from both NestJS (CJS) and Vite (ESM); keep it framework-free.
- No code comments.
