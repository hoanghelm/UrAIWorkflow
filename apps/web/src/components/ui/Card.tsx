import { Card as AntCard, type CardProps } from "antd";

export type { CardProps };

export function Card(props: CardProps) {
  return <AntCard {...props} />;
}
