import { localCatalog } from "./sources/local";
import type { CatalogRepository } from "./repository";

/** The active catalog source. Swap the implementation here to change sources. */
export const catalog: CatalogRepository = localCatalog;

export * from "./queries";
export type * from "./types";
