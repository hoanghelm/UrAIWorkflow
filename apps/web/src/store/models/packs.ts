import { createModel } from "@rematch/core";
import { api, type PackSummary } from "@/lib/api";
import type { RootModel } from ".";

interface PacksState {
  list: PackSummary[];
}

export const packs = createModel<RootModel>()({
  state: { list: [] } as PacksState,
  reducers: {
    setList(state, list: PackSummary[]) {
      return { ...state, list };
    },
  },
  effects: (dispatch) => ({
    async load() {
      const list = await api.packs();
      dispatch.packs.setList(list);
      return list;
    },
  }),
});
