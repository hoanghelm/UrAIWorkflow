import { z } from "zod";

export const boardStatusSchema = z.enum([
  "todo",
  "in_process",
  "review",
  "completed",
  "closed",
  "cancelled",
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
  labels: z.array(z.string()).default([]),
  sprintId: z.string().optional(),
  assignee: z.string().optional(),
});
export type CreateBoardCardInput = z.infer<typeof createBoardCardInputSchema>;

export const updateBoardLabelsInputSchema = z.object({
  labels: z.array(z.string()).default([]),
});
export type UpdateBoardLabelsInput = z.infer<typeof updateBoardLabelsInputSchema>;

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
  labels: z.array(z.string()).default([]),
  sprintId: z.string().nullable().default(null),
  assignee: z.string().nullable().default(null),
  order: z.number().int(),
});
export type BoardCard = z.infer<typeof boardCardSchema>;

export const updateBoardAssigneeInputSchema = z.object({
  assignee: z.string().min(1).nullable(),
});
export type UpdateBoardAssigneeInput = z.infer<typeof updateBoardAssigneeInputSchema>;

export const sprintSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
});
export type Sprint = z.infer<typeof sprintSchema>;

export const createSprintInputSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
});
export type CreateSprintInput = z.infer<typeof createSprintInputSchema>;

export const boardAutomationSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  trigger: z.string(),
  action: z.string(),
  enabled: z.boolean(),
});
export type BoardAutomation = z.infer<typeof boardAutomationSchema>;

export const createBoardAutomationInputSchema = z.object({
  projectId: z.string().min(1),
  trigger: z.string().min(1),
  action: z.string().min(1),
});
export type CreateBoardAutomationInput = z.infer<typeof createBoardAutomationInputSchema>;

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
