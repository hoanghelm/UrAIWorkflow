import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Modal,
  Button,
  Input,
  Select,
  Empty,
  Spin,
  AppstoreAddOutlined,
  PartitionOutlined,
  SearchOutlined,
} from "@/components/ui";
import { useBrowse, type Category } from "@/features/marketplace/useBrowse";
import { ComponentCard } from "@/features/marketplace/ComponentCard";

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "template", label: "Templates" },
  { key: "agent", label: "Agents" },
  { key: "skill", label: "Skills" },
  { key: "command", label: "Commands" },
  { key: "mcp", label: "MCPs" },
  { key: "plugin", label: "Plugins" },
];

export function AddComponentsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [cat, setCat] = useState<Category>("all");
  const browse = useBrowse(cat);

  return (
    <Modal
      title="Add components"
      open={open}
      onCancel={onClose}
      width={920}
      footer={
        <div className="flex items-center justify-between">
          <Button icon={<PartitionOutlined />} onClick={() => navigate("/build")}>
            Build a workflow
          </Button>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-faint">{browse.selectedCount} selected</span>
            <Button
              type="primary"
              icon={<AppstoreAddOutlined />}
              loading={browse.installing}
              disabled={!browse.canInstall || browse.selectedCount === 0}
              onClick={browse.install}
            >
              Add to project
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={`rounded-full px-3 py-1 text-sm ${
                cat === c.key
                  ? "bg-accent text-white"
                  : "bg-surface-2 text-muted hover:text-fg"
              }`}
            >
              {c.label}
              {browse.counts[c.key] ? ` (${browse.counts[c.key]})` : ""}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Input
            className="flex-1"
            prefix={<SearchOutlined className="text-faint" />}
            placeholder="Search components"
            value={browse.query}
            onChange={(e) => browse.setQuery(e.target.value)}
            allowClear
          />
          <Select
            value={browse.sort}
            style={{ width: 150 }}
            onChange={(v) => browse.setSort(v as "popular" | "name")}
            options={[
              { label: "Most popular", value: "popular" },
              { label: "Name", value: "name" },
            ]}
          />
        </div>

        <div className="max-h-[52vh] overflow-y-auto pr-1">
          {browse.isLoading ? (
            <div className="flex justify-center py-16">
              <Spin />
            </div>
          ) : browse.items.length === 0 ? (
            <Empty description="No components match your search" />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {browse.items.map((item) => (
                <ComponentCard
                  key={item.id}
                  item={item}
                  selected={browse.isSelected(item.id)}
                  onToggle={() => browse.toggle(item.id)}
                  onOpen={() => browse.toggle(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
