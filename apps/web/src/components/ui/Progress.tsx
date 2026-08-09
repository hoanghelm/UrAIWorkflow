import { Progress as AntProgress, type ProgressProps } from "antd";

export type { ProgressProps };

export function Progress(props: ProgressProps) {
  return <AntProgress {...props} />;
}
