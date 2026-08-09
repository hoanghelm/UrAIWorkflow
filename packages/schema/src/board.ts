import { z } from "zod";

export const boardStatusSchema = z.enum([
  "todo",
  "in_process",
  "review",
  "completed",
  "closed",
]);
export type BoardStatus = z.infer<typeof boardStatusSchema>;

export const itemTypeSchema = z.enum(["epic", "task", "issue"]);
export type ItemType = z.infer<typeof itemTypeSchema>;

export const artifactSchema = z.object({
  name: z.string(),
  path: z.string(),
  kind: z.string().default("file"),
});
export type Artifact = z.infer<typeof artifactSchema>;

export const createBoardCardInputSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  requirement: z.string().default(""),
  type: itemTypeSchema.default("task"),
  parentId: z.string().optional(),
  pack: z.string().default("eng-loop"),
  model: z.enum(["opus", "sonnet", "haiku"]).default("sonnet"),
  maxLoops: z.number().int().min(1).max(50).default(8),
});
export type CreateBoardCardInput = z.infer<typeof createBoardCardInputSchema>;

export const moveBoardCardInputSchema = z.object({
  status: boardStatusSchema,
  order: z.number().int().min(0),
});
export type MoveBoardCardInput = z.infer<typeof moveBoardCardInputSchema>;

export const reviewStateSchema = z.enum(["none", "approved", "changes_requested"]);
export type ReviewState = z.infer<typeof reviewStateSchema>;

export const boardCardSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  requirement: z.string(),
  type: itemTypeSchema,
  parentId: z.string().nullable(),
  pack: z.string(),
  model: z.string(),
  maxLoops: z.number().int(),
  status: boardStatusSchema,
  review: reviewStateSchema.default("none"),
  runId: z.string().nullable(),
  worktree: z.string().nullable(),
  artifacts: z.array(artifactSchema),
  links: z.array(z.string()),
  order: z.number().int(),
});
export type BoardCard = z.infer<typeof boardCardSchema>;

export const commentAuthorSchema = z.enum(["human", "ai"]);
export type CommentAuthor = z.infer<typeof commentAuthorSchema>;

export const commentKindSchema = z.enum(["comment", "approve", "request_changes"]);
export type CommentKind = z.infer<typeof commentKindSchema>;

export const boardCommentSchema = z.object({
  id: z.string(),
  cardId: z.string(),
  author: commentAuthorSchema,
  kind: commentKindSchema,
  body: z.string(),
  createdAt: z.string(),
});
export type BoardComment = z.infer<typeof boardCommentSchema>;

export const createBoardCommentInputSchema = z.object({
  body: z.string().default(""),
  kind: commentKindSchema.default("comment"),
  author: commentAuthorSchema.default("human"),
});
export type CreateBoardCommentInput = z.infer<typeof createBoardCommentInputSchema>;
