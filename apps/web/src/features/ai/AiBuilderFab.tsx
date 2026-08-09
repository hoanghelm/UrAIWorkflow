import { RobotOutlined } from "@/components/ui";
import { useAiBuilderTarget } from "@/lib/activity/hooks";

export function AiBuilderFab() {
  const target = useAiBuilderTarget();
  if (!target) {
    return null;
  }
  return (
    <button
      onClick={target.open}
      title={`AI Builder: ${target.label}`}
      className="fixed bottom-11 right-4 z-40 flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
      style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.28)" }}
    >
      <RobotOutlined />
      AI Builder
      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">{target.label}</span>
    </button>
  );
}
