import { Popconfirm as AntPopconfirm, type PopconfirmProps } from "antd";

export type { PopconfirmProps };

export function Popconfirm(props: PopconfirmProps) {
  return <AntPopconfirm {...props} />;
}
