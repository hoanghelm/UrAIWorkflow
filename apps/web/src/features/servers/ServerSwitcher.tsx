import { useState } from "react";
import { Button, Input, Modal, notify, Tag, ApiOutlined, PlusOutlined, DeleteOutlined } from "@/components/ui";
import {
  getServers,
  getActiveServer,
  setActiveServer,
  saveServer,
  removeServer,
  testServer,
  type ServerConfig,
} from "@/lib/servers";

export function ServerSwitcher() {
  const [open, setOpen] = useState(false);
  const [servers, setServers] = useState<ServerConfig[]>(() => getServers());
  const active = getActiveServer();

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState<{ ok: boolean; mode?: string; authRequired?: boolean; error?: string } | null>(null);

  const refresh = () => setServers(getServers());

  const runTest = async () => {
    if (!url.trim()) return;
    setTesting(true);
    try {
      const res = await testServer(url.trim(), token.trim());
      setTested(res);
      if (res.ok) notify.success("Reachable", `mode: ${res.mode}${res.authRequired ? " · token required" : ""}`);
      else notify.error("Not reachable", res.error);
    } finally {
      setTesting(false);
    }
  };

  const add = () => {
    if (!name.trim() || !url.trim()) return;
    saveServer({ id: `srv-${Date.now()}`, name: name.trim(), url: url.trim(), token: token.trim() });
    setName("");
    setUrl("");
    setToken("");
    setTested(null);
    refresh();
    notify.success("Server added");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Switch server"
        className="flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-xs text-muted hover:border-accent"
      >
        <ApiOutlined className={active.url ? "text-accent" : "text-faint"} />
        <span className="max-w-[140px] truncate">{active.name}</span>
      </button>

      <Modal title="Servers" open={open} onCancel={() => setOpen(false)} footer={null} width={520}>
        <div className="flex flex-col gap-2 pt-1">
          <div className="text-xs text-muted">
            Run VCC-Workflow's backend (runner + models) here or on a remote server. The UI stays on your machine and
            talks to the active server.
          </div>

          {servers.map((s) => {
            const isActive = s.id === active.id;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 ${isActive ? "border-accent bg-accent/5" : "border-line"}`}
              >
                <ApiOutlined className={s.url ? "text-accent" : "text-faint"} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-fg">{s.name}</span>
                  <span className="block truncate font-mono text-[11px] text-faint">
                    {s.url || "local (this computer)"}
                  </span>
                </span>
                {isActive ? (
                  <Tag color="success">active</Tag>
                ) : (
                  <Button size="small" onClick={() => setActiveServer(s.id)}>
                    Use
                  </Button>
                )}
                {s.id !== "local" && (
                  <Button
                    size="small"
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      removeServer(s.id);
                      refresh();
                    }}
                  />
                )}
              </div>
            );
          })}

          <div className="mt-2 flex flex-col gap-2 rounded-md border border-line p-3">
            <div className="text-xs font-semibold uppercase text-faint">Add a server</div>
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              placeholder="https://your-server.example.com"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTested(null);
              }}
            />
            <Input
              type="password"
              placeholder="Access token (if the server requires one)"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            {tested && !tested.ok && <div className="text-xs text-red-500">Not reachable: {tested.error}</div>}
            {tested?.ok && (
              <div className="text-xs text-green-600">
                Reachable · mode {tested.mode}
                {tested.authRequired ? " · token required" : ""}
              </div>
            )}
            <div className="flex gap-2">
              <Button loading={testing} disabled={!url.trim()} onClick={runTest}>
                Test
              </Button>
              <Button type="primary" icon={<PlusOutlined />} disabled={!name.trim() || !url.trim()} onClick={add}>
                Add
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
