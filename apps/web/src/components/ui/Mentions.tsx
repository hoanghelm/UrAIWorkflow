import { Mentions as AntMentions } from "antd";
import type { ComponentProps } from "react";

export function Mentions(props: ComponentProps<typeof AntMentions>) {
  return <AntMentions {...props} />;
}
