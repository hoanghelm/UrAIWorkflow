import { Select as AntSelect, type SelectProps } from "antd";

export type { SelectProps };

export function Select(props: SelectProps) {
  return <AntSelect {...props} />;
}
