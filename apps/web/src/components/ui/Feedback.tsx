import { Empty as AntEmpty, Spin as AntSpin, Statistic as AntStatistic } from "antd";
import type { ComponentProps } from "react";

export function Empty(props: ComponentProps<typeof AntEmpty>) {
  return <AntEmpty {...props} />;
}

export function Spin(props: ComponentProps<typeof AntSpin>) {
  return <AntSpin {...props} />;
}

export function Statistic(props: ComponentProps<typeof AntStatistic>) {
  return <AntStatistic {...props} />;
}
