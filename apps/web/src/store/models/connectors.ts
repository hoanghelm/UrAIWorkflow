import { createModel } from "@rematch/core";
import type { Connector, CreateConnectorInput } from "@vcc-workflow/schema";
import { api } from "@/lib/api";
import type { RootModel } from ".";

interface ConnectorsState {
  list: Connector[];
}

export const connectors = createModel<RootModel>()({
  state: { list: [] } as ConnectorsState,
  reducers: {
    setList(state, list: Connector[]) {
      return { ...state, list };
    },
  },
  effects: (dispatch) => ({
    async load() {
      const list = await api.connectors();
      dispatch.connectors.setList(list);
      return list;
    },
    async create(input: CreateConnectorInput) {
      await api.createConnector(input);
      const list = await api.connectors();
      dispatch.connectors.setList(list);
    },
    async activate(id: string) {
      await api.activateConnector(id);
      const list = await api.connectors();
      dispatch.connectors.setList(list);
    },
    async deactivate() {
      const list = await api.deactivateConnectors();
      dispatch.connectors.setList(list);
    },
    async remove(id: string) {
      await api.deleteConnector(id);
      const list = await api.connectors();
      dispatch.connectors.setList(list);
    },
  }),
});
