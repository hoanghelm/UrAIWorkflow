import { useEffect, useMemo, useState } from "react";
import type { UsageStat } from "@vcc-workflow/schema";
import {
  Button,
  Card,
  Empty,
  Tag,
  Table,
  PageHeader,
  notify,
  FundOutlined,
  RobotOutlined,
  BulbOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  type Columns,
} from "@/components/ui";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const KIND_META: Record<UsageStat["blockKind"], { label: string; color: string; icon: JSX.Element }> = {
  agent: { label: "Agents", color: "#E8734A", icon: <RobotOutlined /> },
  skill: { label: "Skills", color: "#6366F1", icon: <BulbOutlined /> },
  mcp: { label: "MCP servers", color: "#0EA5E9", icon: <ApiOutlined /> },
  tool: { label: "Tools", color: "#64748B", icon: <ThunderboltOutlined /> },
};

const KIND_ORDER: UsageStat["blockKind"][] = ["agent", "skill", "mcp", "tool"];

export function StatsPage() {
  const dispatch = useAppDispatch();
  const currentId = useAppSelector((s) => s.projects.currentId);
  const list = useAppSelector((s) => s.stats.list);
  const [rebuilding, setRebuilding] = useState(false);

  useEffect(() => {
    if (currentId) {
      void dispatch.stats.load(currentId);
    }
  }, [currentId, dispatch]);

  const rebuild = async () => {
    if (!currentId) {
      return;
    }
    setRebuilding(true);
    try {
      const { runs, blocks } = await dispatch.stats.backfill(currentId);
      notify.success("Usage rebuilt", `Read ${runs} runs, found ${blocks} blocks.`);
    } catch {
      notify.error("Could not rebuild usage from run history.");
    } finally {
      setRebuilding(false);
    }
  };

  const groups = useMemo(() => {
    const by = new Map<UsageStat["blockKind"], UsageStat[]>();
    for (const row of list) {
      const arr = by.get(row.blockKind) ?? [];
      arr.push(row);
      by.set(row.blockKind, arr);
    }
    return KIND_ORDER.filter((k) => by.has(k)).map((k) => [k, by.get(k) as UsageStat[]] as const);
  }, [list]);

  const totalCalls = useMemo(() => list.reduce((sum, r) => sum + r.invocations, 0), [list]);

  const columns: Columns<UsageStat> = [
    { title: "Block", dataIndex: "blockName", key: "blockName" },
    {
      title: "Invocations",
      dataIndex: "invocations",
      key: "invocations",
      width: 130,
      align: "right",
      render: (n: number) => <span className="font-mono tabular-nums">{n}</span>,
    },
    {
      title: "Last used",
      dataIndex: "lastUsedAt",
      key: "lastUsedAt",
      width: 200,
      render: (v: string) => <span className="text-muted">{new Date(v).toLocaleString()}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        icon={<FundOutlined />}
        title="Usage"
        subtitle="Which agents, skills, MCP servers, and tools your runs actually use."
        extra={
          currentId ? (
            <Button icon={<ReloadOutlined />} loading={rebuilding} onClick={rebuild}>
              Rebuild from history
            </Button>
          ) : undefined
        }
      />

      {!currentId ? (
        <Empty description="Select a workspace to see its usage." />
      ) : list.length === 0 ? (
        <Empty description="No usage yet. Run a workflow and its blocks will show up here." />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="text-sm text-muted">
            {totalCalls} call{totalCalls === 1 ? "" : "s"} across {list.length} block
            {list.length === 1 ? "" : "s"}
          </div>
          {groups.map(([kind, rows]) => (
            <Card key={kind}>
              <div className="mb-3 flex items-center gap-2">
                <span style={{ color: KIND_META[kind].color }}>{KIND_META[kind].icon}</span>
                <span className="font-medium text-fg">{KIND_META[kind].label}</span>
                <Tag color={KIND_META[kind].color}>{rows.length}</Tag>
              </div>
              <Table<UsageStat>
                rowKey={(r) => `${r.blockKind}:${r.blockName}`}
                columns={columns}
                dataSource={rows}
                pagination={false}
                size="small"
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
