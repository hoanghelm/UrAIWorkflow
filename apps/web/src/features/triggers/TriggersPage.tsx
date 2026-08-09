import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Trigger } from "@vcc-workflow/schema";
import {
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Select,
  Switch,
  Popconfirm,
  Space,
  Tag,
  Spin,
  notify,
  PageHeader,
  ClockCircleOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  DeleteOutlined,
  type Columns,
  Table,
} from "@/components/ui";
import { api } from "@/lib/api";
import { usePacksQuery } from "@/lib/queries";
import { useAppSelector } from "@/store/hooks";

export function TriggersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const currentId = useAppSelector((s) => s.projects.currentId);
  const { data: packs = [] } = usePacksQuery();
  const { data: triggers = [], isLoading } = useQuery({
    queryKey: ["triggers", currentId],
    queryFn: () => api.triggers(currentId ?? undefined),
    enabled: Boolean(currentId),
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pack, setPack] = useState<string>();
  const [type, setType] = useState<"manual" | "schedule">("manual");
  const [intervalMin, setIntervalMin] = useState(60);

  const refresh = () => qc.invalidateQueries({ queryKey: ["triggers", currentId] });

  const onCreate = async () => {
    if (!currentId || !name || !pack) {
      notify.error("Name and pack are required");
      return;
    }
    await api.createTrigger({
      name,
      projectId: currentId,
      pack,
      type,
      intervalSec: intervalMin * 60,
      enabled: true,
    });
    setOpen(false);
    setName("");
    setPack(undefined);
    void refresh();
    notify.success("Trigger created");
  };

  const fire = async (id: string) => {
    const res = await api.fireTrigger(id);
    void refresh();
    notify.success("Fired");
    navigate(`/runs/${res.runId}`);
  };

  const columns: Columns<Trigger> = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Pack", dataIndex: "pack", key: "pack" },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (v: string, r: Trigger) => (
        <Tag color={v === "schedule" ? "blue" : "default"}>
          {v === "schedule" ? `every ${Math.round(r.intervalSec / 60)}m` : "manual"}
        </Tag>
      ),
    },
    {
      title: "Last run",
      dataIndex: "lastRunAt",
      key: "lastRunAt",
      render: (v: string | null) => (v ? new Date(v).toLocaleString() : "never"),
    },
    {
      title: "Enabled",
      dataIndex: "enabled",
      key: "enabled",
      render: (v: boolean, r: Trigger) => (
        <Switch
          checked={v}
          onChange={async (checked) => {
            await api.setTriggerEnabled(r.id, checked);
            void refresh();
          }}
        />
      ),
    },
    {
      title: "",
      key: "actions",
      render: (_: unknown, r: Trigger) => (
        <Space>
          <Button size="small" icon={<ThunderboltOutlined />} onClick={() => fire(r.id)}>
            Fire now
          </Button>
          <Popconfirm
            title="Delete trigger?"
            onConfirm={async () => {
              await api.deleteTrigger(r.id);
              void refresh();
            }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        icon={<ClockCircleOutlined />}
        title="Triggers"
        subtitle="Run a pack on demand or on a schedule. Scheduled triggers fire automatically."
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!currentId}
            onClick={() => setOpen(true)}
          >
            New trigger
          </Button>
        }
      />

      {!currentId ? (
        <Empty description="Select a project to manage its triggers" />
      ) : isLoading ? (
        <div className="flex justify-center py-16">
          <Spin />
        </div>
      ) : triggers.length === 0 ? (
        <Empty description="No triggers yet. Create one to run a pack manually or on a schedule." />
      ) : (
        <Card>
          <Table<Trigger> rowKey="id" columns={columns} dataSource={triggers} pagination={false} />
        </Card>
      )}

      <Modal
        title="New trigger"
        open={open}
        onOk={onCreate}
        onCancel={() => setOpen(false)}
        okText="Create"
      >
        <div className="flex flex-col gap-3 py-2">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Select
            placeholder="Pack to run"
            value={pack}
            options={packs.map((p) => ({ label: p.name, value: p.name }))}
            onChange={(v) => setPack(v as string)}
          />
          <Select
            value={type}
            options={[
              { label: "Manual (fire on demand)", value: "manual" },
              { label: "Schedule (auto every N minutes)", value: "schedule" },
            ]}
            onChange={(v) => setType(v as "manual" | "schedule")}
          />
          {type === "schedule" && (
            <Input
              type="number"
              addonBefore="Every"
              addonAfter="minutes"
              value={intervalMin}
              onChange={(e) => setIntervalMin(Number(e.target.value) || 60)}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
