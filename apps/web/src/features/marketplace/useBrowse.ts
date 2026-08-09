import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useMarketplaceQuery } from "@/lib/queries";
import { notify } from "@/components/ui";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export type Category = "all" | "template" | "skill" | "agent" | "command" | "hook" | "mcp" | "plugin";

export function useBrowse(category: Category) {
  const dispatch = useAppDispatch();
  const { data: list = [], isLoading } = useMarketplaceQuery();
  const selected = useAppSelector((s) => s.marketplace.selected);
  const currentId = useAppSelector((s) => s.projects.currentId);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"popular" | "name">("popular");
  const [installing, setInstalling] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: list.length };
    for (const item of list) {
      c[item.kind] = (c[item.kind] ?? 0) + 1;
    }
    return c;
  }, [list]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = list.filter(
      (item) =>
        (category === "all" || item.kind === category) &&
        (!q ||
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.tags.some((t) => t.includes(q))),
    );
    return [...filtered].sort((a, b) =>
      sort === "popular" ? b.stars - a.stars : a.name.localeCompare(b.name),
    );
  }, [list, category, query, sort]);

  const toggle = (id: string) => dispatch.marketplace.toggle(id);
  const isSelected = (id: string) => selected.includes(id);

  const install = async () => {
    if (!currentId) {
      notify.error("Select a project first");
      return;
    }
    if (selected.length === 0) {
      return;
    }
    setInstalling(true);
    const res = await api.installComponents(currentId, selected);
    setInstalling(false);
    dispatch.marketplace.clearSelected();
    void dispatch.catalog.load(currentId);
    notify.success(`Added ${res.installed.length} to the project`);
  };

  return {
    items,
    counts,
    isLoading,
    query,
    setQuery,
    sort,
    setSort,
    selectedCount: selected.length,
    toggle,
    isSelected,
    install,
    installing,
    canInstall: Boolean(currentId),
  };
}
