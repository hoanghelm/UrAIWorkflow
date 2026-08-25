import { useEffect, useRef, useState } from "react";
import type { Connector } from "@vcc-workflow/schema";
import {
  Button,
  Card,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Empty,
  notify,
  PageHeader,
  ApiOutlined,
  PlusOutlined,
  SaveOutlined,
  ExperimentOutlined,
  DeleteOutlined,
  CopyOutlined,
  type Columns,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { useServerConfig } from "@/lib/serverConfig";
import { useConnectors } from "./useConnectors";

interface CopilotLogin {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  interval: number;
}

type Provider = "claude-agent" | "claude" | "copilot";

const PROVIDER_LABEL: Record<string, string> = {
  "claude-agent": "Claude subscription",
  claude: "Anthropic API key",
  copilot: "GitHub Copilot",
};

const PROVIDER_OPTIONS: { value: Provider; label: string }[] = [
  { value: "claude-agent", label: "Claude subscription (Pro / Max login)" },
  { value: "claude", label: "Anthropic API key" },
  { value: "copilot", label: "GitHub Copilot (unofficial)" },
];

export function ConnectorsPage() {
  const { list, create, activate, deactivate, remove, test, testingId, reload } = useConnectors();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<Provider>("claude-agent");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [copilot, setCopilot] = useState<CopilotLogin | null>(null);
  const [copilotBusy, setCopilotBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentId = useAppSelector((s) => s.projects.currentId);
  const [projectActiveId, setProjectActiveId] = useState<string | null>(null);
  const { data: serverConfig } = useServerConfig();
  const locked = serverConfig?.connectorsLocked ?? false;
  const allowedProviders = serverConfig?.allowedProviders;
  const providerOptions = allowedProviders?.length
    ? PROVIDER_OPTIONS.filter((o) => allowedProviders.includes(o.value))
    : PROVIDER_OPTIONS;

  const loadProjectActive = async () => {
    if (!currentId) {
      setProjectActiveId(null);
      return;
    }
    const { connectorId } = await api.projectActiveConnector(currentId);
    setProjectActiveId(connectorId);
  };

  useEffect(() => {
    void loadProjectActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  const toggleActive = async (id: string, checked: boolean) => {
    if (currentId) {
      if (checked) {
        await api.setProjectActiveConnector(currentId, id);
      } else {
        await api.clearProjectActiveConnector(currentId);
      }
      await loadProjectActive();
    } else if (checked) {
      await activate(id);
    } else {
      await deactivate();
    }
  };

  const isActive = (r: Connector) => (currentId ? projectActiveId === r.id : r.active);

  const stopCopilot = () => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    setCopilot(null);
    setCopilotBusy(false);
  };

  useEffect(() => () => stopCopilot(), []);

  const close = () => {
    stopCopilot();
    setOpen(false);
    setName("");
    setProvider("claude-agent");
    setApiKey("");
    setBaseUrl("");
  };

  const startCopilot = async () => {
    setCopilotBusy(true);
    try {
      const login = await api.copilotLogin();
      setCopilot(login);
      const poll = async () => {
        try {
          const res = await api.copilotPoll(login.deviceCode);
          if (res.status === "authorized") {
            close();
            await reload();
            notify.success("GitHub Copilot connected", "Activate it to run your work through Copilot.");
            return;
          }
        } catch {
          stopCopilot();
          notify.error("GitHub sign-in didn't complete. Please try again.");
          return;
        }
        pollRef.current = setTimeout(poll, (login.interval + 1) * 1000);
      };
      pollRef.current = setTimeout(poll, (login.interval + 1) * 1000);
    } catch {
      setCopilotBusy(false);
      notify.error("Could not start the GitHub sign-in.");
    }
  };

  const openAdd = () => {
    setProvider(providerOptions[0]?.value ?? "claude-agent");
    setOpen(true);
  };

  const onSave = async () => {
    if (!name.trim()) {
      notify.error("Please give the connector a name.");
      return;
    }
    if (provider === "claude" && !apiKey.trim()) {
      notify.error("An API key is required for the Anthropic API key provider.");
      return;
    }
    await create({
      name: name.trim(),
      provider,
      apiKey: provider === "claude" ? apiKey : "",
      baseUrl: provider === "claude" ? baseUrl || undefined : undefined,
    });
    close();
  };

  const columns: Columns<Connector> = [
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Provider",
      dataIndex: "provider",
      key: "provider",
      render: (v: string) => <Tag color="gold">{PROVIDER_LABEL[v] ?? v}</Tag>,
    },
    {
      title: "Models (opus / sonnet / haiku)",
      key: "models",
      render: (_: unknown, r: Connector) => (
        <span className="text-xs text-muted">
          {r.models.opus} / {r.models.sonnet} / {r.models.haiku}
        </span>
      ),
    },
    {
      title: "Active",
      key: "active",
      render: (_: unknown, r: Connector) => (
        <Switch checked={isActive(r)} onChange={(checked) => toggleActive(r.id, checked)} />
      ),
    },
    {
      title: "",
      key: "actions",
      render: (_: unknown, r: Connector) => (
        <Space>
          <Button
            size="small"
            icon={<ExperimentOutlined />}
            loading={testingId === r.id}
            onClick={() => test(r.id)}
          >
            Test
          </Button>
          {!locked && (
            <Popconfirm title="Delete this connector?" onConfirm={() => remove(r.id)}>
              <Button size="small" danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const modalFooter =
    provider === "copilot"
      ? [
          <Button key="close" onClick={close}>
            Close
          </Button>,
        ]
      : [
          <Button key="cancel" onClick={close}>
            Cancel
          </Button>,
          <Button key="save" type="primary" icon={<SaveOutlined />} onClick={onSave}>
            Save connector
          </Button>,
        ];

  return (
    <div>
      <PageHeader
        icon={<ApiOutlined />}
        title="Connectors"
        subtitle={
          locked
            ? "Connectors are managed by the server host. Pick which one each workspace runs on."
            : currentId
              ? "Connect a model provider. Each workspace runs on the connector you mark active."
              : "Connect a model provider. The active connector runs your work."
        }
        extra={
          !locked && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
              Add connector
            </Button>
          )
        }
      />
      <Card>
        {list.length === 0 ? (
          <Empty
            description={
              locked
                ? "The server host hasn't configured a connector yet."
                : "No connectors yet. Add one to run your work."
            }
          />
        ) : (
          <Table<Connector> rowKey="id" columns={columns} dataSource={list} pagination={false} />
        )}

        <Modal title="Add connector" open={open} onCancel={close} footer={modalFooter}>
          <div className="flex flex-col gap-3 py-2">
            <label className="text-xs text-muted">Provider</label>
            <Select
              value={provider}
              onChange={(v) => {
                stopCopilot();
                setProvider(v as Provider);
              }}
              options={providerOptions}
            />

            {provider !== "copilot" && (
              <Input
                placeholder="Name (e.g. Personal Claude)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}

            {provider === "claude" && (
              <>
                <Input
                  type="password"
                  placeholder="Anthropic API key (sk-ant-...)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <Input
                  placeholder="Base URL (optional)"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
                <p className="text-xs text-faint">
                  Billed to your Anthropic API credits. The key is encrypted at rest on this machine.
                </p>
              </>
            )}

            {provider === "claude-agent" && (
              <p className="text-xs text-faint">
                Runs on your Claude Pro or Max subscription. Sign in once with <code>claude</code> on this
                machine, then Test the connector to confirm.
              </p>
            )}

            {provider === "copilot" &&
              (copilot ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm">Open the GitHub verification page and enter this code:</p>
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-surface-2 px-3 py-1.5 text-lg tracking-widest">
                      {copilot.userCode}
                    </code>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => {
                        void navigator.clipboard?.writeText(copilot.userCode);
                        notify.success("Code copied");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <a href={copilot.verificationUri} target="_blank" rel="noreferrer">
                    {copilot.verificationUri}
                  </a>
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Spin size="small" /> Waiting for you to authorize in GitHub…
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Button type="primary" loading={copilotBusy} onClick={startCopilot}>
                    Sign in with GitHub Copilot
                  </Button>
                  <p className="text-xs text-faint">
                    Uses your own GitHub Copilot subscription through an API GitHub does not officially
                    support for third-party apps; it may put your account at risk. Use at your own
                    discretion.
                  </p>
                </div>
              ))}
          </div>
        </Modal>
      </Card>
    </div>
  );
}
