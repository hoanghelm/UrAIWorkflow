import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Tag,
  Empty,
  Spin,
  Markdown,
  notify,
  ArrowLeftOutlined,
  AppstoreAddOutlined,
  CopyOutlined,
  LinkOutlined,
  DownloadOutlined,
  FileTextOutlined,
  FolderOutlined,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useMarketplaceQuery } from "@/lib/queries";
import { useAppSelector } from "@/store/hooks";

const ACCENT = "#E8734A";

const KIND_LABEL: Record<string, string> = {
  template: "Template",
  skill: "Skill",
  agent: "Agent",
  command: "Command",
  hook: "Hook",
  mcp: "MCP",
  plugin: "Plugin",
};

export function ComponentDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: list = [], isLoading } = useMarketplaceQuery();
  const currentId = useAppSelector((s) => s.projects.currentId);
  const [installing, setInstalling] = useState(false);
  const [tab, setTab] = useState<"code" | "preview">("code");

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spin />
      </div>
    );
  }

  const item = list.find((i) => i.id === id);
  if (!item) {
    return <Empty description="Component not found" />;
  }

  const byId = new Map(list.map((i) => [i.id, i]));
  const included = item.bundle.map((b) => byId.get(b)).filter(Boolean);
  const installCmd = `vcc add ${item.kind}/${item.install || item.name}`;

  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text);
    notify.success("Copied");
  };

  const addToProject = async () => {
    if (!currentId) {
      notify.error("Select a workspace first.");
      return;
    }
    setInstalling(true);
    const res = await api.installComponents(currentId, [item.id]);
    setInstalling(false);
    notify.success(`Added ${res.installed.length} to the project`);
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <button
        onClick={() => navigate(-1)}
        className="flex w-max items-center gap-1 text-sm text-faint hover:text-fg dark:hover:text-gray-200"
      >
        <ArrowLeftOutlined /> Back
      </button>

      <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-xl text-3xl text-white"
          style={{ background: ACCENT }}
        >
          {item.name.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{item.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Tag>{KIND_LABEL[item.kind] ?? item.kind}</Tag>
            {item.tags[0] && <Tag>{item.tags[0]}</Tag>}
            {item.stars > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 font-mono text-xs font-medium text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <DownloadOutlined /> {item.stars.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <Button
          type="primary"
          icon={<AppstoreAddOutlined />}
          loading={installing}
          onClick={addToProject}
        >
          Add to project
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <span
              className="flex h-6 w-6 items-center justify-center rounded text-white"
              style={{ background: "#6366F1" }}
            >
              <CopyOutlined />
            </span>
            Install command
          </div>
          <Button
            type="primary"
            icon={<CopyOutlined />}
            onClick={() => copy(installCmd)}
            style={{ background: "#6366F1", borderColor: "#6366F1" }}
          >
            Copy
          </Button>
        </div>
        <div className="rounded-lg bg-gray-50 px-4 py-3 font-mono text-sm text-[color:#E8734A] dark:bg-gray-800">
          {installCmd}
        </div>
      </div>

      {item.source && (
        <div>
          <Button icon={<LinkOutlined />} onClick={() => window.open(item.source, "_blank")}>
            View on GitHub
          </Button>
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
          Content
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-gray-800">
            <div className="flex gap-1">
              <button
                onClick={() => setTab("code")}
                className={`flex items-center gap-1 rounded-md px-3 py-1 text-sm ${
                  tab === "code" ? "bg-gray-100 font-medium dark:bg-gray-800" : "text-faint"
                }`}
              >
                <FileTextOutlined /> Code
              </button>
              <button
                onClick={() => setTab("preview")}
                className={`flex items-center gap-1 rounded-md px-3 py-1 text-sm ${
                  tab === "preview" ? "bg-gray-100 font-medium dark:bg-gray-800" : "text-faint"
                }`}
              >
                Preview
              </button>
            </div>
            <button
              onClick={() => copy(item.content)}
              className="flex items-center gap-1 text-sm text-faint hover:text-fg dark:hover:text-gray-200"
            >
              <CopyOutlined /> Copy
            </button>
          </div>

          <div className="flex">
            <div className="flex w-10 shrink-0 flex-col items-center gap-1 border-r border-gray-100 py-4 text-faint dark:border-gray-800">
              <FolderOutlined />
              <span className="text-[10px] [writing-mode:vertical-rl]">Files</span>
            </div>
            <div className="max-h-[60vh] flex-1 overflow-auto p-4">
              {tab === "code" ? (
                <pre className="whitespace-pre-wrap font-mono text-[13px] leading-6 text-fg">
                  {item.content}
                </pre>
              ) : (
                <div className="text-sm text-fg">
                  <Markdown>{item.content}</Markdown>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {item.kind === "template" && included.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 text-sm font-semibold">Includes ({included.length})</div>
          <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
            {included.map(
              (c) =>
                c && (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/component/${c.id}`)}
                    className="flex items-center justify-between py-2 text-left"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-sm">{c.name}</span>
                      <Tag>{c.kind}</Tag>
                    </span>
                    {c.stars > 0 && (
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-green-600">
                        <DownloadOutlined /> {c.stars.toLocaleString()}
                      </span>
                    )}
                  </button>
                ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
