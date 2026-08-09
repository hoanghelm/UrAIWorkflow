import { init, type RematchDispatch, type RematchRootState } from "@rematch/core";
import { models, type RootModel } from "./models";

export const store = init<RootModel>({ models });

export type Store = typeof store;
export type Dispatch = RematchDispatch<RootModel>;
export type RootState = RematchRootState<RootModel>;
