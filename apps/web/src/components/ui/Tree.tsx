import { Tree as AntTree, type TreeProps, type TreeDataNode } from "antd";

export type { TreeProps, TreeDataNode };

export function Tree(props: TreeProps) {
  return <AntTree {...props} />;
}
