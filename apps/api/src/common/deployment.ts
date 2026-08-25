export type DeploymentMode = "local" | "hosted";

export function deploymentMode(): DeploymentMode {
  return process.env.DEPLOYMENT_MODE === "hosted" ? "hosted" : "local";
}

export function isHosted(): boolean {
  return deploymentMode() === "hosted";
}
