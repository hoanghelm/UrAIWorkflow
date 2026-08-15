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
import { useConnectors } from "./useConnectors";

interface CopilotLogin {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  interval: number;
}

export function ConnectorsPage() {
  const { list, create, activate, deactivate, remove, test, testingId, reload } = useConnectors();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<"claude" | "claude-agent">("claude-agent");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [copilot, setCopilot] = useState<CopilotLogin | null>(null);
  const [copilotBusy, setCopilotBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopCopilot = () => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    setCopilot(null);
    setCopilotBusy(false);
  };

  useEffect(() => () => stopCopilot(), []);

  const startCopilot = async () => {
    setCopilotBusy(true);
    try {
      const login = await api.copilotLogin();
      setCopilot(login);
      const poll = async () => {
        try {
          const res = await api.copilotPoll(login.deviceCode);
          if (res.status === "authorized") {
            stopCopilot();
            await reload();
            notify.success("GitHub Copilot connected", "Activate it to run your work through Copilot.");
            return;
          }
        } catch {
          stopCopilot();
          notify.error("Copilot sign-in failed or timed out. Try again.");
          return;
        }
        pollRef.current = setTimeout(poll, (login.interval + 1) * 1000);
      };
      pollRef.current = setTimeout(poll, (login.interval + 1) * 1000);
    } catch {
      setCopilotBusy(false);
      notify.error("Could not start GitHub Copilot sign-in.");
    }
  };

  const reset = () => {
    setName("");
    setProvider("claude-agent");
    setApiKey("");
    setBaseUrl("");
  };

  const onCreate = async () => {
    if (!name) {
      notify.error("Name is required");
      return;
    }
    if (provider === "claude" && !apiKey) {
      notify.error("An API key is required for the API-key connector");
      return;
    }
    await create({
      name,
      provider,
      apiKey: provider === "claude" ? apiKey : "",
      baseUrl: provider === "claude" ? baseUrl || undefined : undefined,
    });
    setOpen(false);
    reset();
  };

  const columns: Columns<Connector> = [
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Provider",
      dataIndex: "provider",
      key: "provider",
      render: (v: string) => <Tag color="gold">{v}</Tag>,
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
      dataIndex: "active",
      key: "active",
      render: (v: boolean, r: Connector) => (
        <Switch checked={v} onChange={(checked) => (checked ? activate(r.id) : deactivate())} />
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
          <Popconfirm title="Delete connector?" onConfirm={() => remove(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        icon={<ApiOutlined />}
        title="Connectors"
        subtitle="Connect a model provider. The active connector runs your work."
        extra={
          <Space>
            <Button loading={copilotBusy && !copilot} onClick={startCopilot}>
              Sign in with GitHub Copilot
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              Add connector
            </Button>
          </Space>
        }
      />
      <Card>
      {list.length === 0 ? (
        <Empty description="No connectors yet." />
      ) : (
        <Table<Connector> rowKey="id" columns={columns} dataSource={list} pagination={false} />
      )}

      <Modal
        title="Add Claude connector"
        open={open}
        onOk={onCreate}
        onCancel={() => {
          setOpen(false);
          reset();
        }}
        okText="Save connector"
        okButtonProps={{ icon: <SaveOutlined /> }}
      >
        <div className="flex flex-col gap-3 py-2">
          <Input
            placeholder="Name (e.g. Personal Claude)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Select
            value={provider}
            onChange={(v) => setProvider(v as "claude" | "claude-agent")}
            options={[
              { value: "claude-agent", label: "Claude subscription" },
              { value: "claude", label: "Anthropic API key" },
            ]}
          />
          {provider === "claude" ? (
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
                Billed to your Anthropic API credits. Stored locally in SQLite on this machine.
              </p>
            </>
          ) : (
            <p className="text-xs text-faint">
              Runs on your Claude Pro or Max subscription. Log in once with <code>claude</code>, then
              Test this connector to confirm.
            </p>
          )}
        </div>
      </Modal>

      <Modal
        title="Sign in with GitHub Copilot"
        open={Boolean(copilot)}
        onCancel={stopCopilot}
        footer={
          <Button onClick={stopCopilot} danger>
            Cancel
          </Button>
        }
      >
        {copilot ? (
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm">
              Open the GitHub verification page and enter this code to authorize:
            </p>
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
              <Spin size="small" /> Waiting for you to authorize in GitHub...
            </div>
            <p className="text-xs text-faint">
              Unofficial: this uses your own GitHub Copilot subscription through an unsupported API.
              GitHub does not sanction third-party use and may suspend accounts. Use at your own risk.
            </p>
          </div>
        ) : null}
      </Modal>
      </Card>
    </div>
  );
}
