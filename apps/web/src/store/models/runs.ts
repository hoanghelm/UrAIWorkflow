import { createModel } from "@rematch/core";
import type { RunEvent } from "@vcc-workflow/schema";
import { api, type RunRow } from "@/lib/api";
import type { RootModel } from ".";

interface RunsState {
  list: RunRow[];
  current: RunRow | null;
  events: RunEvent[];
}

export const runs = createModel<RootModel>()({
  state: { list: [], current: null, events: [] } as RunsState,
  reducers: {
    setList(state, list: RunRow[]) {
      return { ...state, list };
    },
    setCurrent(state, current: RunRow | null) {
      return { ...state, current };
    },
    setEvents(state, events: RunEvent[]) {
      return { ...state, events };
    },
    appendEvent(state, event: RunEvent) {
      if (state.current && state.current.id !== event.runId) {
        return state;
      }
      return { ...state, events: [...state.events, event] };
    },
    patchStage(state, payload: { stageId: string; status: string }) {
      if (!state.current) {
        return state;
      }
      return {
        ...state,
        current: {
          ...state.current,
          stages: state.current.stages.map((s) =>
            s.stageId === payload.stageId ? { ...s, status: payload.status } : s,
          ),
        },
      };
    },
  },
  effects: (dispatch) => ({
    async load(projectId: string | undefined) {
      const list = await api.runs(projectId);
      dispatch.runs.setList(list);
      return list;
    },
    async open(id: string) {
      const run = await api.run(id);
      dispatch.runs.setCurrent(run);
      dispatch.runs.setEvents([]);
      return run;
    },
    async start(payload: { projectId: string; pack: string; inputs: Record<string, unknown> }) {
      const workflow = await api.workflowFromPack(payload.pack, payload.inputs);
      const created = await api.createRun({ projectId: payload.projectId, workflow });
      const list = await api.runs(payload.projectId);
      dispatch.runs.setList(list);
      return created;
    },
    async resume(payload: { id: string; answer: string }) {
      await api.resumeRun(payload.id, payload.answer);
      const run = await api.run(payload.id);
      dispatch.runs.setCurrent(run);
      return run;
    },
    async stop(id: string) {
      await api.stopRun(id);
      const run = await api.run(id);
      dispatch.runs.setCurrent(run);
      return run;
    },
    async rerunStage(payload: { id: string; stageId: string }) {
      await api.rerunStage(payload.id, payload.stageId);
      const run = await api.run(payload.id);
      dispatch.runs.setCurrent(run);
      dispatch.runs.setEvents([]);
      return run;
    },
    async refresh(id: string) {
      const run = await api.run(id);
      dispatch.runs.setCurrent(run);
      return run;
    },
    async remove(id: string, state) {
      await api.deleteRun(id);
      await dispatch.runs.load(state.projects.currentId ?? undefined);
    },
  }),
});
