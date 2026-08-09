import { Tag as AntTag, type TagProps } from "antd";

export type { TagProps };

export function Tag(props: TagProps) {
  return <AntTag {...props} />;
}
