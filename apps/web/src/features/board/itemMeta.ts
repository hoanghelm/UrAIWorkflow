import type { ItemType } from "@vcc-workflow/schema";

export const TYPE_META: Record<ItemType, { label: string; color: string }> = {
  epic: { label: "Epic", color: "purple" },
  task: { label: "Task", color: "blue" },
  issue: { label: "Issue", color: "volcano" },
};

export const ITEM_TYPE_OPTIONS = [
  { label: "Epic", value: "epic" },
  { label: "Task", value: "task" },
  { label: "Issue", value: "issue" },
];
