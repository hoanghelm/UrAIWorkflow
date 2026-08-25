import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Tag,
  Empty,
  Spin,
  Select,
  PageHeader,
  notify,
  AppstoreOutlined,
  DownloadOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from "@/components/ui";
import { api, type ProjectPackSummary } from "@/lib/api";
import { usePacksQuery } from "@/lib/queries";
import { useAppSelector } from "@/store/hooks";
import { roleMeta } from "./roleMeta";

export function PacksPage() {
  const navigate = useNavigate();
  const currentId = useAppSelector((s) => s.projects.currentId);
  const queryClient = useQueryClient();
  const base = usePacksQuery();
  const project = useQuery({
    queryKey: ["packs-project", currentId],
    queryFn: () => api.packsForProject(currentId as string),
    enabled: Boolean(currentId),
  });
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const list = (currentId ? project.data : base.data) ?? [];
  const isLoading = currentId ? project.isLoading : base.isLoading;

  const roleFilters = useMemo(() => {
    const roles = [...new Set(list.flatMap((p) => p.roles))].sort();
    return [
      { value: "", label: "All roles" },
      ...roles.map((r) => ({ value: r, label: roleMeta(r).label })),
    ];
  }, [list]);

  const filtered = useMemo(
    () => (role ? list.filter((p) => p.roles.includes(role)) : list),
    [list, role],
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["packs-project", currentId] });

  const install = async (name: string) => {
    if (!currentId) {
      return;
    }
    setBusy(name);
    try {
      const { installedVersion } = await api.installPack(name, currentId);
      await refresh();
      notify.success(`Installed ${name}`, `Version ${installedVersion} pinned for this workspace.`);
    } catch {
      notify.error(`Could not install ${name}.`);
    } finally {
      setBusy(null);
    }
  };

  const uninstall = async (name: string) => {
    if (!currentId) {
      return;
    }
    setBusy(name);
    try {
      await api.uninstallPack(name, currentId);
      await refresh();
      notify.success(`Removed ${name} from this workspace.`);
    } catch {
      notify.error(`Could not remove ${name}.`);
    } finally {
      setBusy(null);
    }
  };

  const installControl = (p: ProjectPackSummary) => {
    if (!p.installed) {
      return (
        <Button
          size="small"
          icon={<DownloadOutlined />}
          loading={busy === p.name}
          onClick={(e) => {
            e.stopPropagation();
            void install(p.name);
          }}
        >
          Install
        </Button>
      );
    }
    if (p.updateAvailable) {
      return (
        <Button
          size="small"
          type="primary"
          icon={<ReloadOutlined />}
          loading={busy === p.name}
          onClick={(e) => {
            e.stopPropagation();
            void install(p.name);
          }}
        >
          Update to {p.latestVersion}
        </Button>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <Tag color="green">Installed {p.installedVersion}</Tag>
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          loading={busy === p.name}
          onClick={(e) => {
            e.stopPropagation();
            void uninstall(p.name);
          }}
        />
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        icon={<AppstoreOutlined />}
        title="Packs"
        subtitle={
          currentId
            ? "Install a pack into this workspace and pin its version. Update when a newer one ships."
            : "Ready-made workflows for every role. Open one to review its steps, run it, or duplicate it."
        }
        extra={
          <Select
            value={role}
            options={roleFilters}
            onChange={(v) => setRole(v as string)}
            style={{ width: 180 }}
          />
        }
      />
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spin />
        </div>
      ) : filtered.length === 0 ? (
        <Empty description="No packs for this role." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/packs/${p.name}`)}
              onKeyDown={(e) => e.key === "Enter" && navigate(`/packs/${p.name}`)}
              className="flex cursor-pointer flex-col gap-2 rounded-xl border border-line bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[15px] font-semibold text-fg">{p.title}</span>
                <Tag color={p.trust === "verified" ? "green" : "default"}>{p.trust}</Tag>
              </div>
              <div className="flex flex-wrap gap-1">
                {p.roles.map((r) => (
                  <Tag key={r} color={roleMeta(r).color}>
                    {roleMeta(r).label}
                  </Tag>
                ))}
              </div>
              <p className="min-h-[48px] text-sm text-muted">{p.description}</p>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-faint">{p.name}</span>
                {currentId ? (
                  installControl(p as ProjectPackSummary)
                ) : (
                  <span className="text-sm text-accent">Open</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
