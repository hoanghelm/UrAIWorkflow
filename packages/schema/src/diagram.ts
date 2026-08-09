import { z } from "zod";

export const generateDiagramInputSchema = z.object({
  requirement: z.string().min(1),
  context: z.string().default(""),
  streamId: z.string().optional(),
});
export type GenerateDiagramInput = z.infer<typeof generateDiagramInputSchema>;

export const generatedDiagramSchema = z.object({
  mermaid: z.string(),
  model: z.string(),
});
export type GeneratedDiagram = z.infer<typeof generatedDiagramSchema>;
