import { Tag } from "@/components/ui";
import { useConnectors } from "./useConnectors";

export function ActiveConnectorBadge() {
  const { active } = useConnectors();
  return (
    <Tag color={active ? "gold" : "default"}>
      {active ? `Claude · ${active.name}` : "Stub agent (no key)"}
    </Tag>
  );
}
