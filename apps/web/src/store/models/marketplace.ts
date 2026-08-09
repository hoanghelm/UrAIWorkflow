import { createModel } from "@rematch/core";
import type { MarketplaceItem } from "@vcc-workflow/schema";
import { api } from "@/lib/api";
import type { RootModel } from ".";

interface MarketplaceState {
  list: MarketplaceItem[];
  selected: string[];
}

export const marketplace = createModel<RootModel>()({
  state: { list: [], selected: [] } as MarketplaceState,
  reducers: {
    setList(state, list: MarketplaceItem[]) {
      return { ...state, list };
    },
    toggle(state, id: string) {
      const selected = state.selected.includes(id)
        ? state.selected.filter((x) => x !== id)
        : [...state.selected, id];
      return { ...state, selected };
    },
    clearSelected(state) {
      return { ...state, selected: [] };
    },
  },
  effects: (dispatch) => ({
    async load() {
      const list = await api.marketplace();
      dispatch.marketplace.setList(list);
      return list;
    },
  }),
});
