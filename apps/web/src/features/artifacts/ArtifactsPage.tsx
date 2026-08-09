import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Empty,
  Tag,
  RunStatusPill,
  notify,
  PageHeader,
  FileZipOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { TYPE_META } from "@/features/board/itemMeta";

export function ArtifactsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const currentId = useAppSelector((s) => s.projects.currentId);
  const [collecting, setCollecting] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ["artifacts", currentId],
    queryFn: () => api.boardArtifacts(currentId as string),
    enabled: Boolean(currentId),
  });

  const collectAll = async () => {
    if (!currentId) {
      return;
    }
    setCollecting(true);
    try {
      const updated = await api.collectAllArtifacts(currentId);
      await qc.invalidateQueries({ queryKey: ["artifacts", currentId] });
      notify.success(`Collected artifacts from ${updated.length} item(s)`);
    } catch {
      notify.error("Collection failed");
    } finally {
      setCollecting(false);
    }
  };

  const totalFiles = items.reduce((sum, i) => sum + i.artifacts.length, 0);

  return (
    <div>
      <PageHeader
        icon={<FileZipOutlined />}
        title="Artifacts"
        subtitle="Files your runs produced, collected from each worktree."
        extra={
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            loading={collecting}
            disabled={!currentId}
            onClick={collectAll}
          >
            Collect from worktrees
          </Button>
        }
      />

      {!currentId ? (
        <Empty description="Select a workspace to see its artifacts." />
      ) : items.length === 0 ? (
        <Empty description="No artifacts yet." />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="text-sm text-muted">
            {totalFiles} file{totalFiles === 1 ? "" : "s"} across {items.length} item
            {items.length === 1 ? "" : "s"}
          </div>
          <Card>
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-md border border-line p-3"
                >
                  <Tag color={TYPE_META[item.type].color}>{TYPE_META[item.type].label}</Tag>
                  <span className="min-w-0 truncate font-medium text-fg">{item.title}</span>
                  <RunStatusPill status={item.status} />
                  <span className="ml-auto font-mono text-xs text-faint">
                    {item.artifacts.length} file{item.artifacts.length === 1 ? "" : "s"}
                  </span>
                  {item.runId && (
                    <Button
                      size="small"
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      style={{ background: "#E8734A" }}
                      title="Open the run to build and deploy"
                      onClick={() => navigate(`/runs/${item.runId}`)}
                    >
                      Run
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
