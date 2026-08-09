import { Modal as AntModal, type ModalProps } from "antd";

export type { ModalProps };

export function Modal(props: ModalProps) {
  return <AntModal {...props} />;
}
