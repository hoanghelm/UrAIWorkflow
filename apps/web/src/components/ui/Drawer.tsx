import { Drawer as AntDrawer, type DrawerProps } from "antd";

export type { DrawerProps };

export function Drawer(props: DrawerProps) {
  return <AntDrawer {...props} />;
}
