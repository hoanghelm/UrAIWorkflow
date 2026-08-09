import { Switch as AntSwitch, type SwitchProps } from "antd";

export type { SwitchProps };

export function Switch(props: SwitchProps) {
  return <AntSwitch {...props} />;
}
