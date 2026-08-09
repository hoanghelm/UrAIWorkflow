import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Input,
  Select,
  Empty,
  Spin,
  PageHeader,
  AppstoreAddOutlined,
  SearchOutlined,
} from "@/components/ui";
import { useBrowse, type Category } from "./useBrowse";
import { ComponentCard } from "./ComponentCard";

const CATEGORIES: Category[] = [
  "all",
  "template",
  "skill",
  "agent",
  "command",
  "hook",
  "mcp",
  "plugin",
];

const TITLE: Record<Category, string> = {
  all: "All components",
  template: "Templates",
  skill: "Skills",
  agent: "Agents",
  command: "Commands",
  hook: "Hooks",
  mcp: "MCPs",
  plugin: "Plugins",
};

function StackBar({
  count,
  onInstall,
  installing,
  canInstall,
}: {
  count: number;
  onInstall: () => void;
  installing: boolean;
  canInstall: boolean;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-4 rounded-full border border-line bg-surface px-5 py-2.5 shadow-lg">
      <span className="font-mono text-sm font-medium">{count} in stack</span>
      <Button
        type="primary"
        icon={<AppstoreAddOutlined />}
        loading={installing}
        disabled={!canInstall}
        onClick={onInstall}
      >
        Add to project
      </Button>
    </div>
  );
}

export function BrowsePage() {
  const navigate = useNavigate();
  const { category } = useParams();
  const cat: Category = CATEGORIES.includes(category as Category) ? (category as Category) : "all";
  const browse = useBrowse(cat);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <PageHeader
        icon={<AppstoreAddOutlined />}
        title={TITLE[cat]}
        subtitle="Ready-to-use skills, agents, commands, hooks, MCPs and plugins."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="flex-1"
          style={{ minWidth: 240 }}
          prefix={<SearchOutlined className="text-faint" />}
          placeholder="Search components…"
          value={browse.query}
          onChange={(e) => browse.setQuery(e.target.value)}
          allowClear
        />
        <Select
          value={browse.sort}
          style={{ width: 160 }}
          onChange={(v) => browse.setSort(v as "popular" | "name")}
          options={[
            { label: "Most popular", value: "popular" },
            { label: "Name", value: "name" },
          ]}
        />
      </div>

      <div className="font-mono text-xs text-faint">{browse.items.length} components</div>

      {browse.isLoading ? (
        <div className="flex justify-center py-16">
          <Spin />
        </div>
      ) : browse.items.length === 0 ? (
        <Empty description="No components match your search" />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {browse.items.map((item) => (
            <ComponentCard
              key={item.id}
              item={item}
              selected={browse.isSelected(item.id)}
              onToggle={() => browse.toggle(item.id)}
              onOpen={() => navigate(`/component/${item.id}`)}
            />
          ))}
        </div>
      )}

      {browse.selectedCount > 0 && (
        <StackBar
          count={browse.selectedCount}
          onInstall={browse.install}
          installing={browse.installing}
          canInstall={browse.canInstall}
        />
      )}
    </div>
  );
}
