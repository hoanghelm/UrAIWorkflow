import { theme } from "antd";
import { Fragment, useState, type ReactNode } from "react";
import { useThemeMode } from "./ThemeProvider";
import { DownOutlined } from "./icons";

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
  useThemeMode();
  const { token } = theme.useToken();
  const [expanded, setExpanded] = useState(() => localStorage.getItem("vcc-rail") === "expanded");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const setRail = (next: boolean) => {
    setExpanded(next);
    localStorage.setItem("vcc-rail", next ? "expanded" : "rail");
  };

  const active = (it: NavItem) =>
    selectedKey === it.key ||
    selectedKey.startsWith(`${it.key}/`) ||
    Boolean(it.children?.some((c) => selectedKey === c.key || selectedKey.startsWith(`${c.key}/`)));

  const isOpen = (it: NavItem) =>
    Boolean(it.children?.length) && (active(it) || openSections.has(it.key));

  const toggleSection = (key: string) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

  const go = (it: NavItem) => {
    if (it.children?.length) {
      toggleSection(it.key);
      return;
    }
    onSelect(it.key);
  };

  return (
    <div className="flex h-full" style={{ paddingBottom: 28, boxSizing: "border-box" }}>
      <nav
        style={{
          width: expanded ? 208 : 56,
          flex: "none",
          background: "#14161c",
          display: "flex",
          flexDirection: "column",
          padding: "10px 0",
          gap: 4,
          transition: "width .14s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: expanded ? "row" : "column",
            alignItems: "center",
            gap: expanded ? 10 : 8,
            padding: expanded ? "2px 10px 8px 14px" : "2px 0 8px",
          }}
        >
          <div style={{ width: 28, height: 28, borderRadius: 7, background: token.colorPrimary, flex: "none" }} />
          {expanded && (
            <span style={{ color: "#e7eaf1", fontWeight: 600, fontSize: 14, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              VCC-Workflow
            </span>
          )}
          <button
            onClick={() => setRail(!expanded)}
            title={expanded ? "Collapse menu" : "Expand menu"}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#7c7f8a", fontSize: 16, width: 24, height: 22, flex: "none", marginLeft: expanded ? "auto" : 0 }}
          >
            {expanded ? "«" : "»"}
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3, padding: expanded ? "0 8px 8px" : "0 0 8px", alignItems: expanded ? "stretch" : "center", scrollbarWidth: "none" }}>
          {items.map((it) => {
            const on = active(it);
            const hasChildren = Boolean(it.children?.length);
            const open = isOpen(it);
            const showChildren = hasChildren && open;
            return (
              <Fragment key={it.key}>
                <button
                  onClick={() => go(it)}
                  title={typeof it.label === "string" ? it.label : it.key}
                  style={{
                    width: expanded ? "100%" : 44,
                    height: expanded ? 36 : 42,
                    flex: "none",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: 8,
                    display: "flex",
                    flexDirection: expanded ? "row" : "column",
                    alignItems: "center",
                    justifyContent: expanded ? "flex-start" : "center",
                    gap: expanded ? 11 : 2,
                    padding: expanded ? "0 11px" : 0,
                    background: on ? "rgba(232,115,74,.16)" : "transparent",
                    color: on ? token.colorPrimary : "#8b93a3",
                  }}
                >
                  <span style={{ fontSize: 15, lineHeight: 1, flex: "none" }}>{it.icon}</span>
                  <span
                    style={
                      expanded
                        ? { fontSize: 13, fontWeight: 500, flex: 1, textAlign: "left" }
                        : {
                            fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
                            fontWeight: 500,
                            fontSize: 7.5,
                            letterSpacing: ".04em",
                            textTransform: "uppercase",
                            maxWidth: 44,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }
                    }
                  >
                    {it.label}
                  </span>
                  {hasChildren && expanded && (
                    <DownOutlined
                      style={{
                        fontSize: 10,
                        flex: "none",
                        transition: "transform .15s ease",
                        transform: open ? "rotate(0deg)" : "rotate(-90deg)",
                        color: on ? token.colorPrimary : "#6d7180",
                      }}
                    />
                  )}
                </button>

                {showChildren &&
                  it.children!.map((child) => {
                    const childOn = selectedKey === child.key;
                    return (
                      <button
                        key={child.key}
                        onClick={() => onSelect(child.key)}
                        title={typeof child.label === "string" ? child.label : child.key}
                        style={{
                          width: expanded ? "100%" : 40,
                          height: 30,
                          flex: "none",
                          border: "none",
                          cursor: "pointer",
                          borderRadius: 7,
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: expanded ? "flex-start" : "center",
                          gap: expanded ? 9 : 0,
                          padding: expanded ? "0 11px 0 32px" : 0,
                          background: childOn ? "rgba(232,115,74,.16)" : "transparent",
                          color: childOn ? token.colorPrimary : "#71757f",
                          fontSize: 12.5,
                        }}
                      >
                        <span style={{ fontSize: 13, lineHeight: 1, flex: "none" }}>{child.icon}</span>
                        {expanded && <span style={{ fontWeight: 500 }}>{child.label}</span>}
                      </button>
                    );
                  })}
              </Fragment>
            );
          })}
        </div>

      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex items-center gap-3"
          style={{
            height: 44,
            flex: "none",
            padding: "0 16px",
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorSplit}`,
          }}
        >
          <div className="min-w-0 flex-1">{breadcrumb}</div>
          <div className="flex items-center gap-3">{toolbar}</div>
          <div>{search}</div>
        </header>
        <main
          className="flex-1 overflow-auto"
          style={{ background: token.colorBgLayout, padding: 24, paddingBottom: 44 }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
