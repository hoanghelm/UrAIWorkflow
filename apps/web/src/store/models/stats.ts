import { createModel } from "@rematch/core";
import type { UsageStat } from "@vcc-workflow/schema";
import { api } from "@/lib/api";
import type { RootModel } from ".";

interface StatsState {
  list: UsageStat[];
}

export const stats = createModel<RootModel>()({
  state: { list: [] } as StatsState,
  reducers: {
    setList(state, list: UsageStat[]) {
      return { ...state, list };
    },
  },
  effects: (dispatch) => ({
    async load(projectId: string) {
      const list = await api.stats(projectId);
      dispatch.stats.setList(list);
      return list;
    },
  }),
});
