import type { ReactNode } from "react";
import {
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from "@/components/ui";
import type { NotifLevel } from "@/lib/activity/notifications";

export const LEVEL_META: Record<NotifLevel, { icon: ReactNode; color: string }> = {
  success: { icon: <CheckCircleOutlined />, color: "text-emerald-500" },
  info: { icon: <InfoCircleOutlined />, color: "text-sky-500" },
  warn: { icon: <WarningOutlined />, color: "text-amber-500" },
  error: { icon: <CloseCircleOutlined />, color: "text-red-500" },
};
