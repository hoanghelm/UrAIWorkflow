import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Card,
  Empty,
  Tag,
  PageHeader,
  FileZipOutlined,
  PlayCircleOutlined,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { TYPE_META } from "@/features/board/itemMeta";

const fmtSize = (b: number) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

export function ArtifactsPage() {
  const navigate = useNavigate();
  const currentId = useAppSelector((s) => s.projects.currentId);

  const { data: versions = [] } = useQuery({
    queryKey: ["artifact-versions", currentId],
    queryFn: () => api.boardArtifactVersions(currentId as string),
    enabled: Boolean(currentId),
  });

  const tasks = useMemo(() => {
    const groups = new Map<string, { title: string; type: "epic" | "task" | "issue"; builds: typeof versions }>();
    for (const v of versions) {
      const key = v.cardId ?? v.id;
      const g = groups.get(key) ?? { title: v.title, type: v.type, builds: [] };
      g.builds.push(v);
      groups.set(key, g);
    }
    return [...groups.entries()];
  }, [versions]);

  return (
    <div>
      <PageHeader
        icon={<FileZipOutlined />}
        title="Artifacts"
        subtitle="Every build your runs produced. Open a build to run and deploy it."
      />

      {!currentId ? (
        <Empty description="Select a workspace to see its artifacts." />
      ) : versions.length === 0 ? (
        <Empty description="No artifacts yet. Run a workflow to produce a build." />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="text-sm text-muted">
            {versions.length} build{versions.length === 1 ? "" : "s"} across {tasks.length} task
            {tasks.length === 1 ? "" : "s"}
          </div>
          {tasks.map(([key, g]) => (
            <Card key={key}>
              <div className="mb-2 flex items-center gap-2">
                <Tag color={TYPE_META[g.type].color}>{TYPE_META[g.type].label}</Tag>
                <span className="min-w-0 truncate font-medium text-fg">{g.title}</span>
                <span className="ml-auto font-mono text-xs text-faint">
                  {g.builds.length} build{g.builds.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {g.builds.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-2 rounded-md border border-line bg-surface-2 px-3 py-1.5"
                  >
                    <span className="text-sm font-medium text-fg">Build {b.build}</span>
                    <span className="font-mono text-xs text-faint">
                      {b.fileCount} file{b.fileCount === 1 ? "" : "s"} · {fmtSize(b.sizeBytes)} ·{" "}
                      {new Date(b.createdAt).toLocaleString()}
                    </span>
                    {b.runId && (
                      <Button
                        size="small"
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        style={{ background: "#E8734A" }}
                        title="Open this build's run to build and deploy"
                        onClick={() => navigate(`/runs/${b.runId}`)}
                        className="ml-auto"
                      >
                        Run
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
