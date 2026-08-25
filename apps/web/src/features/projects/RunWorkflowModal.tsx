import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Modal, Input, TextArea, Select, notify } from "@/components/ui";
import { api, type PackSummary } from "@/lib/api";

const MODELS = [
  { label: "Opus", value: "opus" },
  { label: "Sonnet", value: "sonnet" },
  { label: "Haiku", value: "haiku" },
];

export function RunWorkflowModal({
  projectId,
  pack,
  onClose,
}: {
  projectId: string;
  pack: PackSummary | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("opus");
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (!pack) {
      return;
    }
    setRunning(true);
    try {
      const workflow = await api.workflowFromPack(pack.name, { requirement: prompt });
      const created = await api.createRun({
        projectId,
        title: title.trim() || undefined,
        workflow: { ...workflow, routing: { ...workflow.routing, exec: model } },
      });
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
      onClose();
      navigate(`/runs/${created.id}`);
    } catch {
      notify.error("Could not start the workflow.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Modal
      title={pack ? `Run ${pack.title || pack.name}` : "Run workflow"}
      open={Boolean(pack)}
      onCancel={onClose}
      onOk={run}
      okText="Run workflow"
      confirmLoading={running}
    >
      {pack && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">{pack.description}</p>
          <div>
            <div className="mb-1 text-xs uppercase text-faint">Title (optional)</div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task name (optional)"
            />
          </div>
          <div>
            <div className="mb-1 text-xs uppercase text-faint">Requirements</div>
            <TextArea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What should this workflow do?"
            />
          </div>
          <div>
            <div className="mb-1 text-xs uppercase text-faint">Model</div>
            <Select value={model} options={MODELS} onChange={(v) => setModel(v as string)} style={{ width: 160 }} />
          </div>
        </div>
      )}
    </Modal>
  );
}
