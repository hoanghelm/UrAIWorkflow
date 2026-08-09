import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Empty, Spin, Select, PageHeader, AppstoreOutlined } from "@/components/ui";
import { usePacksQuery } from "@/lib/queries";
import { roleMeta } from "./roleMeta";

export function PacksPage() {
  const navigate = useNavigate();
  const { data: list = [], isLoading } = usePacksQuery();
  const [role, setRole] = useState("");

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

  return (
    <div>
      <PageHeader
        icon={<AppstoreOutlined />}
        title="Packs"
        subtitle="Ready-made workflows for every role. Open one to review its steps, run it, or duplicate it."
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
            <button
              key={p.id}
              onClick={() => navigate(`/packs/${p.name}`)}
              className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
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
                <span className="text-sm text-accent">Open</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
