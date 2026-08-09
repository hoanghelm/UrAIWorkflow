import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function useCatalog() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.catalog.items);
  const loading = useAppSelector((s) => s.catalog.loading);
  const currentId = useAppSelector((s) => s.projects.currentId);

  useEffect(() => {
    void dispatch.catalog.load(currentId ?? undefined);
  }, [dispatch, currentId]);

  const rescan = () => {
    if (currentId) {
      void dispatch.catalog.discover(currentId);
    }
  };

  return { items, loading, hasProject: Boolean(currentId), rescan };
}
