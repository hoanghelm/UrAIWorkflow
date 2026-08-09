import { useMemo, useState } from "react";
import type { CatalogItem } from "@vcc-workflow/schema";
import {
  Button,
  Card,
  Empty,
  Select,
  PageHeader,
  DatabaseOutlined,
  ReloadOutlined,
  Table,
  Tag,
  type Columns,
} from "@/components/ui";
import { useCatalog } from "./useCatalog";

const KIND_OPTIONS = [
  { value: "", label: "All kinds" },
  { value: "agent", label: "Agents" },
  { value: "skill", label: "Skills" },
  { value: "tool", label: "Tools" },
  { value: "mcp", label: "MCPs" },
  { value: "plugin", label: "Plugins" },
  { value: "command", label: "Commands" },
  { value: "rule", label: "Rules" },
];

const columns: Columns<CatalogItem> = [
  {
    title: "Name",
    key: "name",
    render: (_: unknown, r: CatalogItem) => (
      <div>
        <div className="font-medium text-fg">{r.title || r.name}</div>
        {r.description && <div className="text-xs text-muted">{r.description}</div>}
      </div>
    ),
  },
  { title: "Kind", dataIndex: "kind", key: "kind", render: (v: string) => <Tag>{v}</Tag> },
  {
    title: "Source",
    key: "source",
    render: (_: unknown, r: CatalogItem) =>
      r.builtin ? <Tag color="gold">built-in</Tag> : <Tag>project</Tag>,
  },
  {
    title: "Trust",
    dataIndex: "trust",
    key: "trust",
    render: (v: string) => <Tag color={v === "verified" ? "green" : "default"}>{v}</Tag>,
  },
];

export function CatalogPage() {
  const { items, loading, hasProject, rescan } = useCatalog();
  const [kind, setKind] = useState("");

  const filtered = useMemo(
    () => (kind ? items.filter((i) => i.kind === kind) : items),
    [items, kind],
  );

  return (
    <div>
      <PageHeader
        icon={<DatabaseOutlined />}
        title="Catalog"
        subtitle="Built-in agents, skills, tools, MCPs and plugins, plus anything discovered in the active project."
        extra={
          <div className="flex items-center gap-2">
            <Select
              value={kind}
              options={KIND_OPTIONS}
              onChange={(v) => setKind(v as string)}
              style={{ width: 160 }}
            />
            {hasProject && (
              <Button icon={<ReloadOutlined />} onClick={rescan}>
                Rescan
              </Button>
            )}
          </div>
        }
      />
      <Card>
        {filtered.length === 0 && !loading ? (
          <Empty description="No components for this kind." />
        ) : (
          <Table<CatalogItem> rowKey="id" loading={loading} columns={columns} dataSource={filtered} />
        )}
      </Card>
    </div>
  );
}
