import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { notify } from "@/components/ui";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function usePacks() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const list = useAppSelector((s) => s.packs.list);
  const currentId = useAppSelector((s) => s.projects.currentId);

  useEffect(() => {
    void dispatch.packs.load();
  }, [dispatch]);

  const run = async (pack: string) => {
    if (!currentId) {
      notify.error("Select a project first");
      return;
    }
    const created = await dispatch.runs.start({ projectId: currentId, pack, inputs: {} });
    notify.success("Run started");
    navigate(`/runs/${created.id}`);
  };

  return { list, canRun: Boolean(currentId), run };
}
