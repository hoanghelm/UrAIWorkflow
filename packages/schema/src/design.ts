import { z } from "zod";

export const designKindSchema = z.enum(["wireframe", "mockup", "flow", "design-system", "diagram"]);
export type DesignKind = z.infer<typeof designKindSchema>;

export const designFormatSchema = z.enum(["html", "mermaid"]);
export type DesignFormat = z.infer<typeof designFormatSchema>;

export const designFormatForKind = (kind: DesignKind): DesignFormat =>
  kind === "diagram" || kind === "flow" ? "mermaid" : "html";

export const designSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  description: z.string().default(""),
  createdAt: z.string(),
  artifactCount: z.number().int().default(0),
});
export type Design = z.infer<typeof designSchema>;

export const designArtifactSchema = z.object({
  id: z.string(),
  designId: z.string(),
  kind: designKindSchema,
  title: z.string(),
  format: designFormatSchema,
  content: z.string().default(""),
  version: z.number().int().default(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DesignArtifact = z.infer<typeof designArtifactSchema>;

export const designVersionSchema = z.object({
  id: z.string(),
  artifactId: z.string(),
  build: z.number().int(),
  content: z.string(),
  createdAt: z.string(),
});
export type DesignVersion = z.infer<typeof designVersionSchema>;

export const createDesignInputSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
});
export type CreateDesignInput = z.infer<typeof createDesignInputSchema>;

export const createDesignArtifactInputSchema = z.object({
  designId: z.string().min(1),
  kind: designKindSchema,
  title: z.string().min(1),
  content: z.string().default(""),
});
export type CreateDesignArtifactInput = z.infer<typeof createDesignArtifactInputSchema>;

export const updateDesignArtifactInputSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
});
export type UpdateDesignArtifactInput = z.infer<typeof updateDesignArtifactInputSchema>;
