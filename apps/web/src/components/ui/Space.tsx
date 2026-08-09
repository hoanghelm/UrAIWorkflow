import { Space as AntSpace, type SpaceProps } from "antd";

export type { SpaceProps };

export function Space(props: SpaceProps) {
  return <AntSpace {...props} />;
}
