import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function useProjects() {
  const dispatch = useAppDispatch();
  const list = useAppSelector((s) => s.projects.list);
  const currentId = useAppSelector((s) => s.projects.currentId);

  useEffect(() => {
    void dispatch.projects.load();
  }, [dispatch]);

  const select = (id: string) => dispatch.projects.choose(id);

  const register = (name: string, root: string, persona?: string) =>
    dispatch.projects.register({ name, root, persona });

  const setPersona = (id: string, persona: string) =>
    dispatch.projects.setPersona({ id, persona });

  const remove = (id: string) => dispatch.projects.remove(id);

  const reload = () => dispatch.projects.load();

  return { list, currentId, select, register, setPersona, remove, reload };
}

export function useWorkspacePersona(): string {
  return useAppSelector((s) => {
    const cur = s.projects.currentId;
    return s.projects.list.find((p) => p.id === cur)?.persona ?? "generalist";
  });
}
