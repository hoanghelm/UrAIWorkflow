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
  ProfileOutlined,
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
  ExperimentOutlined,
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
import { DesignGalleryPage } from "@/features/design/DesignGalleryPage";
import { DesignDetailPage } from "@/features/design/DesignDetailPage";
import { DesignToolPage } from "@/features/design/DesignToolPage";
import { TestToolPage } from "@/features/tests/TestToolPage";
import { TriggersPage } from "@/features/triggers/TriggersPage";
import { ArtifactsPage } from "@/features/artifacts/ArtifactsPage";
import { ActiveConnectorBadge } from "@/features/connectors/ActiveConnectorBadge";
import { ServerSwitcher } from "@/features/servers/ServerSwitcher";
import { PacksPage } from "@/features/packs/PacksPage";
import { CatalogPage } from "@/features/catalog/CatalogPage";
import { RunsPage } from "@/features/runs/RunsPage";
import { RunDetailPage } from "@/features/runs/RunDetailPage";
import { WorkflowBuilderPage } from "@/features/workflow/WorkflowBuilderPage";
import { ConnectorsPage } from "@/features/connectors/ConnectorsPage";
import { TokensPage } from "@/features/dashboard/TokensPage";
import { StatsPage } from "@/features/stats/StatsPage";
import { BoardPage } from "@/features/board/BoardPage";
import { RepoReviewPage } from "@/features/repo/RepoReviewPage";
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
  {
    key: "design",
    label: "Design",
    icon: <DeploymentUnitOutlined />,
    children: [
      { key: "/design", label: "My designs", icon: <AppstoreOutlined /> },
      { key: "/design/tool/mockup", label: "Mockup", icon: <BuildOutlined /> },
      { key: "/design/tool/wireframe", label: "Wireframe", icon: <ProfileOutlined /> },
      { key: "/design/tool/flow", label: "User flow", icon: <PartitionOutlined /> },
      { key: "/design/tool/design-system", label: "Design system", icon: <BlockOutlined /> },
      { key: "/design/diagrams", label: "Diagrams", icon: <DeploymentUnitOutlined /> },
    ],
  },
  {
    key: "tests",
    label: "Tests",
    icon: <ExperimentOutlined />,
    children: [
      { key: "/tests/unit", label: "Unit tests", icon: <CodeOutlined /> },
      { key: "/tests/integration", label: "Integration", icon: <PartitionOutlined /> },
      { key: "/tests/e2e", label: "E2E / automation", icon: <ThunderboltOutlined /> },
      { key: "/tests/api", label: "API tests", icon: <ApiOutlined /> },
      { key: "/tests/test-plan", label: "Test plan", icon: <ProfileOutlined /> },
    ],
  },
  { key: "/runs", label: "Runs", icon: <ThunderboltOutlined /> },
  { key: "/artifacts", label: "Artifacts", icon: <FileZipOutlined /> },
  { key: "/triggers", label: "Triggers", icon: <ClockCircleOutlined /> },
  { key: "/tokens", label: "Tokens", icon: <FundOutlined /> },
  { key: "/usage", label: "Usage", icon: <ProfileOutlined /> },
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
          <ServerSwitcher />
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
        <Route path="/design" element={<DesignGalleryPage />} />
        <Route path="/design/diagrams" element={<DiagramsPage />} />
        <Route path="/design/tool/:kind" element={<DesignToolPage />} />
        <Route path="/design/:id" element={<DesignDetailPage />} />
        <Route path="/tests/:kind" element={<TestToolPage />} />
        <Route path="/diagrams" element={<Navigate to="/design/diagrams" replace />} />
        <Route path="/runs" element={<RunsPage />} />
        <Route path="/runs/:id" element={<RunDetailPage />} />
        <Route path="/artifacts" element={<ArtifactsPage />} />
        <Route path="/triggers" element={<TriggersPage />} />
        <Route path="/tokens" element={<TokensPage />} />
        <Route path="/usage" element={<StatsPage />} />
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
      <Route path="/repo/:runId" element={<RepoReviewPage />} />
      <Route path="/*" element={<DashboardApp />} />
    </Routes>
  );
}
