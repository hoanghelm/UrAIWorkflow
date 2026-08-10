import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Modal, Input, notify } from "@/components/ui";
import { api } from "@/lib/api";

const TOKEN_KEY = "figma_token";

export function FigmaModal({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? "");
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (!url.trim() || !token.trim()) {
      notify.error("Paste a Figma frame URL and your Figma access token.");
      return;
    }
    setRunning(true);
    try {
      localStorage.setItem(TOKEN_KEY, token.trim());
      const { runId } = await api.figmaGenerate(projectId, url.trim(), token.trim(), title.trim() || undefined);
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
      onClose();
      setUrl("");
      setTitle("");
      navigate(`/runs/${runId}`);
    } catch {
      notify.error("Could not start. Check the URL and token, then retry.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Modal
      title="Screen from Figma"
      open={open}
      onCancel={onClose}
      onOk={run}
      okText="Generate"
      confirmLoading={running}
      width={560}
    >
      <div className="flex flex-col gap-3 py-1">
        <p className="text-sm text-muted">
          Paste a Figma frame link. We read the design and build a screen that matches this
          workspace&apos;s stack and conventions. Expect a solid first pass you then tidy up, not a
          pixel-perfect copy.
        </p>
        <div>
          <div className="mb-1 text-xs uppercase text-faint">Title (optional)</div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Name this task, or leave blank"
          />
        </div>
        <div>
          <div className="mb-1 text-xs uppercase text-faint">Figma frame URL</div>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.figma.com/design/FILE_KEY/...?node-id=1-234"
          />
        </div>
        <div>
          <div className="mb-1 text-xs uppercase text-faint">Figma access token</div>
          <Input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="figd_..."
          />
          <div className="mt-1 text-xs text-faint">
            Get one in Figma under Settings, Security. It stays in this browser and goes only to the
            local Figma tool. It is never saved to the repo.
          </div>
        </div>
      </div>
    </Modal>
  );
}
