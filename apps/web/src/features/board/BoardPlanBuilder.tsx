import { useState } from "react";
import { Drawer, Button, RobotOutlined, ProjectOutlined, notify } from "@/components/ui";
import { GenerativeChat, type ChatTurn } from "@/features/ai/GenerativeChat";
import { useWorkspacePersona } from "@/features/projects/useProjects";
import { api } from "@/lib/api";

interface PlanItem {
  title: string;
  detail: string;
}

export function BoardPlanBuilder({
  projectId,
  open,
  onClose,
  onCreated,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const persona = useWorkspacePersona();
  const [context, setContext] = useState("");
  const [items, setItems] = useState<PlanItem[]>([]);
  const [creating, setCreating] = useState(false);

  const plan = async (message: string, history: ChatTurn[]): Promise<string> => {
    const turnContext = [
      context,
      items.length ? `Current plan:\n${items.map((i) => `- ${i.title}`).join("\n")}` : "",
      history.length
        ? `Conversation so far:\n${history.map((m) => `${m.role === "user" ? "Developer" : "You"}: ${m.content}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const res = await api.aiGenerate("plan", { requirement: message, context: turnContext, persona });
    const next = (res.artifact as { items?: PlanItem[] }).items ?? [];
    setItems(next);
    return res.summary;
  };

  const create = async () => {
    if (items.length === 0) return;
    setCreating(true);
    try {
      for (const it of items) {
        await api.createBoardCard({
          projectId,
          title: it.title,
          requirement: it.detail,
          type: "task",
          pack: "eng-loop",
          model: "sonnet",
          maxLoops: 8,
        });
      }
      notify.success(`Created ${items.length} task${items.length === 1 ? "" : "s"} on the board`);
      setItems([]);
      onCreated();
      onClose();
    } finally {
      setCreating(false);
    }
  };

  return (
    <Drawer
      title={
        <span className="flex items-center gap-2">
          <RobotOutlined /> AI Builder: Plan
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
            contextPlaceholder="Anything worth knowing to plan well: audience, constraints, deadline"
            inputPlaceholder="Describe a goal to break into tasks"
            emptyHint="Describe a goal. I'll turn it into an ordered plan, then add the tasks to your board."
            starters={[
              "Launch a monthly newsletter: audience research, content calendar, template, and send.",
              "Onboard a new hire in their first week.",
            ]}
            onSend={plan}
          />
        </div>
        {items.length > 0 && (
          <Button
            type="primary"
            icon={<ProjectOutlined />}
            loading={creating}
            onClick={create}
            block
          >
            Create {items.length} task{items.length === 1 ? "" : "s"} on the board
          </Button>
        )}
      </div>
    </Drawer>
  );
}
