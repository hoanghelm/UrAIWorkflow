import { Input as AntInput, type InputProps } from "antd";

export type { InputProps };

export function Input(props: InputProps) {
  return <AntInput {...props} />;
}

export const TextArea = AntInput.TextArea;
