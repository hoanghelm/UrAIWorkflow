import { SearchOutlined } from "@/components/ui";

export function SearchTrigger() {
  const open = () => window.dispatchEvent(new CustomEvent("vcc:open-search"));
  return (
    <button
      onClick={open}
      className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-faint hover:text-fg dark:border-gray-700 dark:hover:text-gray-200"
      style={{ minWidth: 240 }}
    >
      <SearchOutlined />
      <span className="flex-1 text-left">Search components</span>
      <kbd className="rounded border border-gray-200 px-1.5 font-mono text-xs dark:border-gray-700">
        ⌘K
      </kbd>
    </button>
  );
}
