import { createModel } from "@rematch/core";
import type { Project } from "@vcc-workflow/schema";
import { api } from "@/lib/api";
import type { RootModel } from ".";

const LAST_KEY = "vcc:workspace";

interface ProjectsState {
  list: Project[];
  currentId: string | null;
}

export const projects = createModel<RootModel>()({
  state: { list: [], currentId: null } as ProjectsState,
  reducers: {
    setList(state, list: Project[]) {
      return { ...state, list };
    },
    setCurrent(state, currentId: string | null) {
      return { ...state, currentId };
    },
  },
  effects: (dispatch) => ({
    async load(_: void, state) {
      const list = await api.projects();
      dispatch.projects.setList(list);
      if (!state.projects.currentId) {
        const saved = localStorage.getItem(LAST_KEY);
        if (saved && list.some((p) => p.id === saved)) {
          await dispatch.projects.choose(saved);
        }
      }
      return list;
    },
    async choose(id: string) {
      dispatch.projects.setCurrent(id);
      localStorage.setItem(LAST_KEY, id);
      await Promise.all([dispatch.catalog.load(id), dispatch.runs.load(id)]);
    },
    async setPersona(payload: { id: string; persona: string }) {
      await api.setProjectPersona(payload.id, payload.persona);
      const list = await api.projects();
      dispatch.projects.setList(list);
    },
    async remove(id: string, state) {
      await api.deleteProject(id);
      const list = await api.projects();
      dispatch.projects.setList(list);
      if (state.projects.currentId === id) {
        dispatch.projects.setCurrent(null);
        localStorage.removeItem(LAST_KEY);
      }
    },
    async register(payload: { name: string; root: string; persona?: string }) {
      const project = await api.registerProject(payload.name, payload.root, payload.persona);
      const list = await api.projects();
      dispatch.projects.setList(list);
      await dispatch.projects.choose(project.id);
      return project;
    },
  }),
});
