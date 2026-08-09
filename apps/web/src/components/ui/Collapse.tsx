import { Collapse as AntCollapse, type CollapseProps } from "antd";

export type { CollapseProps };

export function Collapse(props: CollapseProps) {
  return <AntCollapse {...props} />;
}
