import type { ReactNode } from "react";
import type { MarketplaceItem } from "@vcc-workflow/schema";
import {
  ThunderboltOutlined,
  RobotOutlined,
  CodeOutlined,
  FunctionOutlined,
  ApiOutlined,
  BlockOutlined,
  BuildOutlined,
  DownloadOutlined,
  LinkOutlined,
  PlusOutlined,
  CheckOutlined,
} from "@/components/ui";

const ACCENT = "#E8734A";

const KIND_ICON: Record<string, ReactNode> = {
  template: <BuildOutlined />,
  skill: <ThunderboltOutlined />,
  agent: <RobotOutlined />,
  command: <CodeOutlined />,
  hook: <FunctionOutlined />,
  mcp: <ApiOutlined />,
  plugin: <BlockOutlined />,
};

function formatCount(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  }
  return String(n);
}

export function ComponentCard({
  item,
  selected,
  onToggle,
  onOpen,
}: {
  item: MarketplaceItem;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      className="group relative flex cursor-pointer flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
      style={selected ? { borderColor: ACCENT, boxShadow: `0 0 0 1px ${ACCENT}` } : undefined}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-label={selected ? "Remove from stack" : "Add to stack"}
        className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border text-xs"
        style={
          selected
            ? { background: ACCENT, borderColor: ACCENT, color: "#fff" }
            : { borderColor: "#d1d5db" }
        }
      >
        {selected ? <CheckOutlined /> : <PlusOutlined />}
      </button>

      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg text-white"
          style={{ background: ACCENT }}
        >
          {KIND_ICON[item.kind]}
        </span>
        <div className="min-w-0 flex-1 pr-6">
          <div className="truncate font-mono text-[15px] font-semibold">{item.name}</div>
          <div className="font-mono text-xs text-faint">
            {item.kind === "template" && item.bundle.length > 0
              ? `bundle · ${item.bundle.length} components`
              : item.author || "community"}
          </div>
        </div>
      </div>

      <p className="line-clamp-2 min-h-[40px] text-sm text-muted">
        {item.description}
      </p>

      <div className="flex items-center justify-between">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-xs text-muted dark:bg-gray-800 dark:text-faint">
          {item.tags[0] ?? item.kind}
        </span>
        <div className="flex items-center gap-2">
          {item.source && (
            <a
              href={item.source}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-faint hover:text-fg dark:hover:text-gray-200"
            >
              <LinkOutlined />
            </a>
          )}
          {item.stars > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 font-mono text-xs font-medium text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <DownloadOutlined /> {formatCount(item.stars)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
