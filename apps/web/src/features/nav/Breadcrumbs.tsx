import { Fragment } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { RightOutlined } from "@/components/ui";
import { api } from "@/lib/api";
import { useProjectSummariesQuery } from "@/lib/queries";

interface Crumb {
  label: string;
  to?: string;
}

const LABELS: Record<string, string> = {
  workspace: "Workspaces",
  board: "Board",
  browse: "Browse",
  component: "Component",
  packs: "Packs",
  build: "Build",
  diagrams: "Diagrams",
  runs: "Runs",
  artifacts: "Artifacts",
  triggers: "Triggers",
  tokens: "Tokens",
  usage: "Usage",
  catalog: "Catalog",
  connectors: "Connectors",
};

function useCrumbs(): Crumb[] {
  const { pathname } = useLocation();
  const params = useParams();
  const { data: summaries = [] } = useProjectSummariesQuery();
  const runId = pathname.startsWith("/runs/") ? params.id : undefined;
  const { data: run } = useQuery({
    queryKey: ["run", runId],
    queryFn: () => api.run(runId as string),
    enabled: Boolean(runId),
  });

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) {
    return [{ label: "Workspaces" }];
  }

  const head = parts[0];
  const crumbs: Crumb[] = [{ label: LABELS[head] ?? head, to: `/${head}` }];

  if (head === "workspace" && parts[1]) {
    const project = summaries.find((p) => p.id === parts[1]);
    crumbs.push({ label: project?.name ?? "Project" });
  } else if (head === "runs" && parts[1]) {
    crumbs.push({ label: run?.name ?? "Run" });
  } else if (head === "packs" && parts[1]) {
    crumbs.push({ label: decodeURIComponent(parts[1]) });
  } else if (head === "browse" && parts[1]) {
    crumbs.push({ label: LABELS[parts[1]] ?? parts[1] });
  } else if (head === "component" && parts[1]) {
    crumbs.push({ label: "Detail" });
  }

  if (crumbs.length > 0) {
    delete crumbs[crumbs.length - 1].to;
  }
  return crumbs;
}

export function Breadcrumbs() {
  const crumbs = useCrumbs();
  return (
    <nav className="flex items-center gap-1.5 text-sm">
      {crumbs.map((c, i) => (
        <Fragment key={i}>
          {i > 0 && <RightOutlined className="text-[10px] text-faint" />}
          {c.to ? (
            <Link to={c.to} className="text-muted hover:text-fg">
              {c.label}
            </Link>
          ) : (
            <span className="font-medium text-fg">{c.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
