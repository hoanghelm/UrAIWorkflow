import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { Workflow } from "@vcc-workflow/schema";
import { Drawer, Button, ThunderboltOutlined, RobotOutlined, notify } from "@/components/ui";
import { GenerativeChat, type ChatTurn } from "@/features/ai/GenerativeChat";
import { useWorkspacePersona } from "./useProjects";
import { api } from "@/lib/api";

export function ProjectAiBuilder({
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
  const persona = useWorkspacePersona();
  const [context, setContext] = useState("");
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [running, setRunning] = useState(false);

  const build = async (message: string, history: ChatTurn[]): Promise<string> => {
    const turnContext = [
      context,
      workflow ? `Current workflow "${workflow.name}":\n${JSON.stringify(workflow.stages.map((s) => ({ title: s.title, action: s.action, instruction: s.instruction })))}` : "",
      history.length
        ? `Conversation so far:\n${history.map((m) => `${m.role === "user" ? "Developer" : "You"}: ${m.content}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const res = await api.aiGenerate("workflow", { requirement: message, context: turnContext, persona });
    const wf = res.artifact as Workflow;
    setWorkflow(wf);
    return (
      `Designed **${wf.name}**, ${wf.stages.length} step${wf.stages.length === 1 ? "" : "s"}:\n\n` +
      wf.stages.map((s, i) => `${i + 1}. ${s.title || s.id}${s.gate ? " · approval" : ""}`).join("\n") +
      `\n\nRun it below, or ask for changes.`
    );
  };

  const run = async () => {
    if (!workflow) return;
    setRunning(true);
    try {
      const created = await api.createRun({ projectId, workflow });
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
      onClose();
      navigate(`/runs/${created.id}`);
    } catch {
      notify.error("Could not start the run. Activate a Claude connector and retry.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Drawer
      title={
        <span className="flex items-center gap-2">
          <RobotOutlined /> AI Builder: Workflow
        </span>
      }
      placement="right"
      width={460}
      open={open}
      onClose={onClose}
      styles={{ body: { height: "100%" } }}
    >
      <div className="flex h-full flex-col gap-3">
        <div className="min-h-0 flex-1">
          <GenerativeChat
            context={context}
            setContext={setContext}
            contextPlaceholder="e.g. This is a NestJS + React repo; deploy via Docker; tests with vitest."
            inputPlaceholder="Describe the automation to build for this project…"
            emptyHint="Describe an automation. I'll design a workflow for this project, then run it end to end."
            starters={[
              "Review the latest changes, run the tests, and open a PR with a summary.",
              "Take a requirement, break it into tasks, implement each, and verify.",
            ]}
            onSend={build}
          />
        </div>
        {workflow && (
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            loading={running}
            onClick={run}
            block
          >
            Run “{workflow.name}” in this project
          </Button>
        )}
      </div>
    </Drawer>
  );
}
