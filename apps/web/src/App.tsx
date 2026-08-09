import { useMemo } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  AppShell,
  Space,
  FolderOutlined,
  AppstoreOutlined,
  AppstoreAddOutlined,
  PartitionOutlined,
  ThunderboltOutlined,
  FundOutlined,
  DatabaseOutlined,
  ApiOutlined,
  RobotOutlined,
  CodeOutlined,
  FunctionOutlined,
  BlockOutlined,
  BuildOutlined,
  DeploymentUnitOutlined,
  ClockCircleOutlined,
  ProjectOutlined,
  FileZipOutlined,
  type NavItem,
} from "@/components/ui";
import { ProjectSwitcher } from "@/features/projects/ProjectSwitcher";
import { WorkspacePage } from "@/features/projects/WorkspacePage";
import { BrowsePage } from "@/features/marketplace/BrowsePage";
import { ComponentDetailPage } from "@/features/marketplace/ComponentDetailPage";
import { CommandPalette } from "@/features/marketplace/CommandPalette";
import { SearchTrigger } from "@/features/marketplace/SearchTrigger";
import { Breadcrumbs } from "@/features/nav/Breadcrumbs";
import { ProjectDetailPage } from "@/features/projects/ProjectDetailPage";
import { PackDetailPage } from "@/features/packs/PackDetailPage";
import { DiagramsPage } from "@/features/diagrams/DiagramsPage";
import { TriggersPage } from "@/features/triggers/TriggersPage";
import { BoardPage } from "@/features/board/BoardPage";
import { ArtifactsPage } from "@/features/artifacts/ArtifactsPage";
import { ActiveConnectorBadge } from "@/features/connectors/ActiveConnectorBadge";
import { PacksPage } from "@/features/packs/PacksPage";
import { CatalogPage } from "@/features/catalog/CatalogPage";
import { RunsPage } from "@/features/runs/RunsPage";
import { RunDetailPage } from "@/features/runs/RunDetailPage";
import { WorkflowBuilderPage } from "@/features/workflow/WorkflowBuilderPage";
import { ConnectorsPage } from "@/features/connectors/ConnectorsPage";
import { TokensPage } from "@/features/dashboard/TokensPage";
import { ActivityProvider } from "@/lib/activity/ActivityProvider";
import { ActivityBar } from "@/features/activity/ActivityBar";
import { AiBuilderFab } from "@/features/ai/AiBuilderFab";
import { Toasts } from "@/features/activity/Toasts";

const NAV: NavItem[] = [
  { key: "/workspace", label: "Workspace", icon: <FolderOutlined /> },
  { key: "/board", label: "Board", icon: <ProjectOutlined /> },
  {
    key: "browse",
    label: "Browse",
    icon: <AppstoreAddOutlined />,
    children: [
      { key: "/browse", label: "All", icon: <AppstoreOutlined /> },
      { key: "/browse/template", label: "Templates", icon: <BuildOutlined /> },
      { key: "/browse/skill", label: "Skills", icon: <ThunderboltOutlined /> },
      { key: "/browse/agent", label: "Agents", icon: <RobotOutlined /> },
      { key: "/browse/command", label: "Commands", icon: <CodeOutlined /> },
      { key: "/browse/hook", label: "Hooks", icon: <FunctionOutlined /> },
      { key: "/browse/mcp", label: "MCPs", icon: <ApiOutlined /> },
      { key: "/browse/plugin", label: "Plugins", icon: <BlockOutlined /> },
    ],
  },
  { key: "/packs", label: "Packs", icon: <AppstoreOutlined /> },
  { key: "/build", label: "Build", icon: <PartitionOutlined /> },
  { key: "/diagrams", label: "Diagrams", icon: <DeploymentUnitOutlined /> },
  { key: "/runs", label: "Runs", icon: <ThunderboltOutlined /> },
  { key: "/artifacts", label: "Artifacts", icon: <FileZipOutlined /> },
  { key: "/triggers", label: "Triggers", icon: <ClockCircleOutlined /> },
  { key: "/tokens", label: "Tokens", icon: <FundOutlined /> },
  { key: "/catalog", label: "Catalog", icon: <DatabaseOutlined /> },
  { key: "/connectors", label: "Connectors", icon: <ApiOutlined /> },
];

const FLAT_KEYS = NAV.flatMap((n) => (n.children ? n.children.map((c) => c.key) : [n.key]));

function DashboardApp() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey = useMemo(() => {
    const matches = FLAT_KEYS.filter((k) => location.pathname === k || location.pathname.startsWith(`${k}/`));
    if (location.pathname.startsWith("/browse/")) {
      const exact = FLAT_KEYS.find((k) => k === location.pathname);
      if (exact) {
        return exact;
      }
    }
    return matches.sort((a, b) => b.length - a.length)[0] ?? "/workspace";
  }, [location.pathname]);

  return (
    <ActivityProvider>
    <AppShell
      items={NAV}
      selectedKey={selectedKey}
      onSelect={(key) => navigate(key)}
      search={<SearchTrigger />}
      breadcrumb={<Breadcrumbs />}
      toolbar={
        <Space size="middle">
          <ActiveConnectorBadge />
          <ProjectSwitcher />
        </Space>
      }
    >
      <Routes>
        <Route path="/" element={<Navigate to="/workspace" replace />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/workspace/:projectId" element={<ProjectDetailPage />} />
        <Route path="/board" element={<BoardPage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/browse/:category" element={<BrowsePage />} />
        <Route path="/component/:id" element={<ComponentDetailPage />} />
        <Route path="/packs" element={<PacksPage />} />
        <Route path="/packs/:name" element={<PackDetailPage />} />
        <Route path="/build" element={<WorkflowBuilderPage />} />
        <Route path="/diagrams" element={<DiagramsPage />} />
        <Route path="/runs" element={<RunsPage />} />
        <Route path="/runs/:id" element={<RunDetailPage />} />
        <Route path="/artifacts" element={<ArtifactsPage />} />
        <Route path="/triggers" element={<TriggersPage />} />
        <Route path="/tokens" element={<TokensPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/connectors" element={<ConnectorsPage />} />
      </Routes>
    </AppShell>
    <CommandPalette />
    <AiBuilderFab />
    <ActivityBar />
    <Toasts />
    </ActivityProvider>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/*" element={<DashboardApp />} />
    </Routes>
  );
}
