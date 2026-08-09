import { Tabs as AntTabs, type TabsProps } from "antd";

export type { TabsProps };

export function Tabs(props: TabsProps) {
  return <AntTabs {...props} />;
}
