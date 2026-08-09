import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Input, Modal, PlusOutlined, Select, notify } from "@/components/ui";
import { useProjects } from "./useProjects";

export function ProjectSwitcher() {
  const { list, currentId, select, register } = useProjects();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [root, setRoot] = useState("");

  const onRegister = async () => {
    if (!name || !root) {
      notify.error("Name and root are required");
      return;
    }
    await register(name, root);
    void queryClient.invalidateQueries({ queryKey: ["project-summaries"] });
    setOpen(false);
    setName("");
    setRoot("");
    notify.success("Workspace added");
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        icon={<PlusOutlined />}
        onClick={() => setOpen(true)}
        aria-label="Add workspace"
        title="Add workspace"
      />
      <Select
        placeholder="Pick a workspace"
        style={{ minWidth: 220 }}
        value={currentId ?? undefined}
        onChange={(v) => select(v as string)}
        options={list.map((p) => ({ label: p.name, value: p.id }))}
      />
      <Modal
        title="Add workspace"
        open={open}
        onOk={onRegister}
        onCancel={() => setOpen(false)}
        okText="Add"
      >
        <div className="flex flex-col gap-3 py-2">
          <Input placeholder="Workspace name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            placeholder="Absolute path to the folder"
            value={root}
            onChange={(e) => setRoot(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
