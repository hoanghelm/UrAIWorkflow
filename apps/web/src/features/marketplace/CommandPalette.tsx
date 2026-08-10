import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { MarketplaceItem } from "@vcc-workflow/schema";
import {
  SearchOutlined,
  BuildOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  CodeOutlined,
  FunctionOutlined,
  ApiOutlined,
  BlockOutlined,
} from "@/components/ui";
import { useMarketplaceQuery } from "@/lib/queries";

const KIND_LABEL: Record<string, string> = {
  template: "Templates",
  skill: "Skills",
  agent: "Agents",
  command: "Commands",
  hook: "Hooks",
  mcp: "MCPs",
  plugin: "Plugins",
};

const KIND_ICON: Record<string, ReactNode> = {
  template: <BuildOutlined />,
  skill: <ThunderboltOutlined />,
  agent: <RobotOutlined />,
  command: <CodeOutlined />,
  hook: <FunctionOutlined />,
  mcp: <ApiOutlined />,
  plugin: <BlockOutlined />,
};

export function CommandPalette() {
  const navigate = useNavigate();
  const { data: list = [] } = useMarketplaceQuery();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("vcc:open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("vcc:open-search", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list
      .filter(
        (i) =>
          !q ||
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.tags.some((t) => t.includes(q)),
      )
      .slice(0, 8);
  }, [list, query]);

  const go = (item: MarketplaceItem) => {
    setOpen(false);
    navigate(`/component/${item.id}`);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      const item = results[active];
      if (item) {
        go(item);
      }
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-gray-100 px-4 dark:border-gray-800">
          <SearchOutlined className="text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search components"
            className="w-full bg-transparent py-3 text-sm outline-none"
          />
          <kbd className="rounded border border-gray-200 px-1.5 text-xs text-faint dark:border-gray-700">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-faint">No components found</div>
          ) : (
            results.map((item, i) => (
              <button
                key={item.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(item)}
                className={`flex w-full items-center justify-between px-4 py-2 text-left ${
                  i === active ? "bg-gray-50 dark:bg-gray-800" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded text-xs text-white"
                    style={{ background: "var(--vcc-accent)" }}
                  >
                    {KIND_ICON[item.kind]}
                  </span>
                  <span className="font-mono text-sm">{item.name}</span>
                  <span className="text-xs text-faint">{KIND_LABEL[item.kind] ?? item.kind}</span>
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-xs text-muted dark:bg-gray-800">
                  {item.tags[0] ?? item.kind}
                </span>
              </button>
            ))
          )}
        </div>
        <div className="flex items-center gap-4 border-t border-gray-100 px-4 py-2 text-xs text-faint dark:border-gray-800">
          <span>arrow keys to move</span>
          <span>enter to open</span>
          <span>esc to close</span>
        </div>
      </div>
    </div>
  );
}
