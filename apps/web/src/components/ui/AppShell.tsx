import { Layout, Menu, theme, type MenuProps } from "antd";
import type { ReactNode } from "react";
import { useThemeMode } from "./ThemeProvider";

const { Sider, Content, Header } = Layout;

export interface NavItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  children?: NavItem[];
}

interface AppShellProps {
  items: NavItem[];
  selectedKey: string;
  onSelect: (key: string) => void;
  search?: ReactNode;
  toolbar?: ReactNode;
  breadcrumb?: ReactNode;
  children: ReactNode;
}

export function AppShell({ items, selectedKey, onSelect, search, toolbar, breadcrumb, children }: AppShellProps) {
  const { mode } = useThemeMode();
  const { token } = theme.useToken();

  return (
    <Layout className="h-full">
      <Sider
        theme={mode}
        width={216}
        style={{
          borderRight: `1px solid ${token.colorSplit}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          className="flex items-center gap-2 px-5 py-4 text-base font-semibold tracking-tight"
          style={{ color: token.colorText }}
        >
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: token.colorPrimary }} />
          VCC-Workflow
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <Menu
            theme={mode}
            mode="inline"
            selectedKeys={[selectedKey]}
            items={items as MenuProps["items"]}
            onClick={(e) => onSelect(e.key)}
            style={{ borderInlineEnd: "none" }}
          />
        </div>
      </Sider>
      <Layout>
        <Header
          className="flex items-center justify-between gap-3 px-6"
          style={{
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorSplit}`,
          }}
        >
          <div className="min-w-0 flex-1">{breadcrumb}</div>
          <div className="flex items-center gap-3">{toolbar}</div>
          <div>{search}</div>
        </Header>
        <Content
          className="overflow-auto p-6"
          style={{ background: token.colorBgLayout, paddingBottom: 44 }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
