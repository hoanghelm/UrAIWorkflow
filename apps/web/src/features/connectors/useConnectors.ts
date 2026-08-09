import { useEffect, useState } from "react";
import type { CreateConnectorInput } from "@vcc-workflow/schema";
import { api } from "@/lib/api";
import { notify } from "@/components/ui";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function useConnectors() {
  const dispatch = useAppDispatch();
  const list = useAppSelector((s) => s.connectors.list);
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    void dispatch.connectors.load();
  }, [dispatch]);

  const create = async (input: CreateConnectorInput) => {
    await dispatch.connectors.create(input);
    notify.success("Connector saved");
  };

  const activate = (id: string) => dispatch.connectors.activate(id);
  const deactivate = () => dispatch.connectors.deactivate();
  const remove = (id: string) => dispatch.connectors.remove(id);

  const test = async (id: string) => {
    setTestingId(id);
    const result = await api.testConnector(id);
    setTestingId(null);
    if (result.ok) {
      notify.success("Connection OK");
    } else {
      notify.error(result.error ?? "Connection failed");
    }
  };

  const active = list.find((c) => c.active) ?? null;

  return { list, active, testingId, create, activate, deactivate, remove, test };
}
