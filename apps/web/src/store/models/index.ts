import type { Models } from "@rematch/core";
import { projects } from "./projects";
import { catalog } from "./catalog";
import { packs } from "./packs";
import { runs } from "./runs";
import { connectors } from "./connectors";
import { marketplace } from "./marketplace";

export interface RootModel extends Models<RootModel> {
  projects: typeof projects;
  catalog: typeof catalog;
  packs: typeof packs;
  runs: typeof runs;
  connectors: typeof connectors;
  marketplace: typeof marketplace;
}

export const models: RootModel = { projects, catalog, packs, runs, connectors, marketplace };
