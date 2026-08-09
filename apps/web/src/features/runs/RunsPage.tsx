import {
  Button,
  Card,
  Empty,
  PageHeader,
  Popconfirm,
  RightOutlined,
  RunStatusPill,
  Table,
  ThunderboltOutlined,
  DeleteOutlined,
  type Columns,
} from "@/components/ui";
import type { RunRow } from "@/lib/api";
import { useRunsList } from "./useRunsList";

export function RunsPage() {
  const { list, hasProject, open, remove } = useRunsList();

  const columns: Columns<RunRow> = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Pack", dataIndex: "pack", key: "pack" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v: string) => <RunStatusPill status={v} />,
    },
    {
      title: "Saved",
      dataIndex: "tokensSaved",
      key: "tokensSaved",
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: "Consumed",
      dataIndex: "tokensConsumed",
      key: "tokensConsumed",
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: "",
      key: "actions",
      render: (_: unknown, row: RunRow) => (
        <div className="flex justify-end gap-2">
          <Button icon={<RightOutlined />} iconPosition="end" onClick={() => open(row.id)}>
            Open
          </Button>
          <Popconfirm
            title="Delete this workflow run?"
            description="Its stages, logs and history are permanently removed."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => remove(row.id)}
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        icon={<ThunderboltOutlined />}
        title="Runs"
        subtitle="Every workflow execution for the active project."
      />
      {hasProject ? (
        <Card>
          <Table<RunRow> rowKey="id" columns={columns} dataSource={list} />
        </Card>
      ) : (
        <Empty description="Select a project to see its runs" />
      )}
    </div>
  );
}
