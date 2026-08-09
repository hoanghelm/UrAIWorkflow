import { Button as AntButton, type ButtonProps } from "antd";

export type { ButtonProps };

export function Button(props: ButtonProps) {
  return <AntButton {...props} />;
}
