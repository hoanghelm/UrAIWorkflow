import { z } from "zod";

export const healthStatusSchema = z.object({
  status: z.enum(["ok", "degraded"]).default("ok"),
  db: z.enum(["up", "down"]).default("up"),
  uptimeSeconds: z.number().nonnegative(),
  timestamp: z.string(),
});
export type HealthStatus = z.infer<typeof healthStatusSchema>;
