import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Input,
  Modal,
  Select,
  Tag,
  Empty,
  Spin,
  Popconfirm,
  notify,
  PageHeader,
  PlusOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  RightOutlined,
  DeleteOutlined,
  RunStatusPill,
  ThunderboltOutlined,
} from "@/components/ui";
import { useProjectSummariesQuery, useAllRunsQuery, usePersonasQuery } from "@/lib/queries";
import { useProjects } from "./useProjects";

const KIND_ORDER = ["agent", "skill", "command", "rule", "mcp", "plugin"];

function CountChips({ counts }: { counts: Record<string, number> }) {
  const entries = KIND_ORDER.filter((k) => counts[k]);
  if (entries.length === 0) {
    return <span className="font-mono text-xs text-faint">no components yet</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map((k) => (
        <span
          key={k}
          className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-xs text-muted dark:bg-gray-800"
        >
          {counts[k]} {k}
          {counts[k] === 1 ? "" : "s"}
        </span>
      ))}
    </div>
  );
}

export function WorkspacePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentId, select, register, remove } = useProjects();

  const onDelete = async (id: string) => {
    await remove(id);
    void queryClient.invalidateQueries({ queryKey: ["project-summaries"] });
    notify.success("Workspace removed");
  };
  const { data: summaries = [], isLoading } = useProjectSummariesQuery();
  const { data: runs = [] } = useAllRunsQuery();
  const { data: personas = [] } = usePersonasQuery();
  const projectName = (id: string) => summaries.find((p) => p.id === id)?.name ?? "none";
  const personaName = (key: string) => personas.find((p) => p.key === key)?.name ?? key;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [root, setRoot] = useState("");
  const [role, setRole] = useState("generalist");

  const onRegister = async () => {
    if (!name || !root) {
      notify.error("Name and root are required");
      return;
    }
    await register(name, root, role);
    setOpen(false);
    setName("");
    setRoot("");
    setRole("generalist");
    void queryClient.invalidateQueries({ queryKey: ["project-summaries"] });
    notify.success("Workspace added");
  };

  const openProject = (id: string) => {
    select(id);
    navigate(`/workspace/${id}`);
  };

  return (
    <div>
      <PageHeader
        icon={<FolderOutlined />}
        title="Workspaces"
        subtitle="Every workspace you've configured. Open one to see its projects and detected components."
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Add workspace
          </Button>
        }
      />

      <Card styles={{ body: { padding: 0 } }}>
        {isLoading ? (
          <div className="flex justify-center p-10">
            <Spin />
          </div>
        ) : summaries.length === 0 ? (
          <div className="p-6">
            <Empty description="No workspaces yet. Add a repository path to start." />
          </div>
        ) : (
          <div className="flex flex-col">
            {summaries.map((p, i) => {
              const active = p.id === currentId;
              return (
                <div
                  key={p.id}
                  onClick={() => openProject(p.id)}
                  className={`group flex cursor-pointer items-center gap-4 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 ${
                    i > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""
                  }`}
                >
                  {active ? (
                    <FolderOpenOutlined style={{ color: "#E8734A", fontSize: 18 }} />
                  ) : (
                    <FolderOutlined className="text-faint" style={{ fontSize: 18 }} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{p.name}</span>
                      <Tag color="purple">{personaName(p.persona)}</Tag>
                      {active && <Tag color="gold">active</Tag>}
                    </div>
                    <div className="truncate font-mono text-xs text-faint">{p.root}</div>
                  </div>
                  <CountChips counts={p.counts} />
                  <span onClick={(e) => e.stopPropagation()}>
                    <Popconfirm
                      title="Remove this workspace?"
                      description="Removes it and its board items, runs and detected components. Files on disk are untouched."
                      okText="Remove"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => onDelete(p.id)}
                    >
                      <button
                        className="p-1 text-faint opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                        aria-label="Remove workspace"
                      >
                        <DeleteOutlined />
                      </button>
                    </Popconfirm>
                  </span>
                  <RightOutlined className="text-faint" />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="mt-6 mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
        <ThunderboltOutlined className="text-accent" />
        Activity across all workspaces
        <span className="font-mono text-xs font-normal text-faint">({runs.length})</span>
      </div>
      <Card styles={{ body: { padding: 0 } }}>
        {runs.length === 0 ? (
          <div className="p-6">
            <Empty description="No tasks, pipelines or sessions have run yet." />
          </div>
        ) : (
          <div className="flex flex-col">
            {runs.slice(0, 8).map((r, i) => (
              <button
                key={r.id}
                onClick={() => navigate(`/runs/${r.id}`)}
                className={`flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 ${
                  i > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""
                }`}
              >
                <Tag color={r.kind === "session" ? "purple" : "geekblue"}>
                  {r.kind === "session" ? "session" : "pipeline"}
                </Tag>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.name}</div>
                  <div className="font-mono text-xs text-faint">
                    {projectName(r.projectId)} · {r.pack} · saved {r.tokensSaved.toLocaleString()}
                  </div>
                </div>
                <RunStatusPill status={r.status} />
                <RightOutlined className="text-faint" />
              </button>
            ))}
            {runs.length > 8 && (
              <button
                onClick={() => navigate("/runs")}
                className="border-t border-gray-100 px-4 py-2 text-left text-sm text-accent dark:border-gray-800"
              >
                See all {runs.length} runs
              </button>
            )}
          </div>
        )}
      </Card>

      <Modal
        title="Add workspace"
        open={open}
        onOk={onRegister}
        onCancel={() => setOpen(false)}
        okText="Add"
      >
        <div className="flex flex-col gap-3 py-2">
          <Input placeholder="Workspace name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            placeholder="Absolute path to repo root (e.g. D:/tools/VCC-Workflow)"
            value={root}
            onChange={(e) => setRoot(e.target.value)}
          />
          <div>
            <div className="mb-1 text-xs uppercase text-faint">Role for this workspace</div>
            <Select
              value={role}
              onChange={(v) => setRole(v as string)}
              className="w-full"
              options={personas.map((p) => ({ value: p.key, label: p.name }))}
            />
            <div className="mt-1 text-xs text-faint">
              The AI Builder works in this role by default when you're in this workspace.
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
