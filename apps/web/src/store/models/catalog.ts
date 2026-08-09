import { createModel } from "@rematch/core";
import type { CatalogItem } from "@vcc-workflow/schema";
import { api } from "@/lib/api";
import type { RootModel } from ".";

interface CatalogState {
  items: CatalogItem[];
  loading: boolean;
}

export const catalog = createModel<RootModel>()({
  state: { items: [], loading: false } as CatalogState,
  reducers: {
    setItems(state, items: CatalogItem[]) {
      return { ...state, items };
    },
    setLoading(state, loading: boolean) {
      return { ...state, loading };
    },
  },
  effects: (dispatch) => ({
    async load(projectId: string | undefined) {
      dispatch.catalog.setLoading(true);
      const items = await api.catalog(projectId);
      dispatch.catalog.setItems(items);
      dispatch.catalog.setLoading(false);
      return items;
    },
    async discover(projectId: string) {
      dispatch.catalog.setLoading(true);
      const items = await api.discover(projectId);
      dispatch.catalog.setItems(items);
      dispatch.catalog.setLoading(false);
      return items;
    },
  }),
});
