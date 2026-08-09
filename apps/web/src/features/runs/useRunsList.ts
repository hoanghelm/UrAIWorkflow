import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function useRunsList() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const list = useAppSelector((s) => s.runs.list);
  const currentId = useAppSelector((s) => s.projects.currentId);

  useEffect(() => {
    void dispatch.runs.load(currentId ?? undefined);
  }, [dispatch, currentId]);

  const open = (id: string) => navigate(`/runs/${id}`);
  const remove = (id: string) => dispatch.runs.remove(id);

  return { list, hasProject: Boolean(currentId), open, remove };
}
